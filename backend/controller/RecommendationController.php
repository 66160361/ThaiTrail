<?php

class RecommendationController
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    private function requireAuth(): int
    {
        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return (int) $_SESSION['user_id'];
    }

    /**
     * GET /api/recommendations
     *
     * 70/20/10 Feed Allocation based on preference_score and user interactions:
     * - 70% from user's Top Category (highest preference_score).
     * - 20% from places the user viewed but didn't like/save/share.
     * - 10% random discovery from unseen categories (interacted_count = 0).
     *
     * Onboarding prioritization:
     * - If the user is a new user (no interaction history), they are recommended places from their onboarding categories.
     * - If they have started interacting, recommendations shift to score-based recommendations.
     */
    public function index(array $params, array $body): array
    {
        $userId = $this->requireAuth();
        $limit  = min((int) ($params['limit']  ?? 24), 50);
        $offset = max((int) ($params['offset'] ?? 0),  0);

        // 1. ดึงจังหวัดที่ผู้ใช้เข้าดูซ้ำจนถึงเกณฑ์ (อย่างน้อย 3 ครั้ง) เพื่อใช้บวกโบนัสทำเลใกล้เคียง (+2.5)
        $topProvincesStmt = $this->pdo->prepare("
            SELECT p.province, COUNT(*) as view_cnt
            FROM user_signals us
            JOIN places p ON p.id = us.place_id
            WHERE us.user_id = :user_id AND p.province IS NOT NULL AND p.province != ''
            GROUP BY p.province
            HAVING view_cnt >= 3
            ORDER BY view_cnt DESC
            LIMIT 3
        ");
        $topProvincesStmt->execute([':user_id' => $userId]);
        $topProvinces = $topProvincesStmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. ตรวจสอบว่าผู้ใช้มีประวัติการปฏิสัมพันธ์จริงแล้วหรือยัง (เช่น เคยกด Like, Save, Share หรือมี Dwell Time > 0)
        $hasInteractionStmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM user_interactions
            WHERE user_id = :user_id
              AND (has_liked = 1 OR has_saved = 1 OR has_shared = 1 OR click_count > 0 OR total_dwell_time > 0)
        ");
        $hasInteractionStmt->execute([':user_id' => $userId]);
        $hasInteracted = (int) $hasInteractionStmt->fetchColumn() > 0;

        if ($hasInteracted) {
            // เมื่อผู้ใช้เริ่มมีพฤติกรรมแล้ว ให้เรียงตามคะแนนที่ระบบคำนวณจากปฏิสัมพันธ์จริง (Like, Save, Dwell, Click)
            $scoreSql = "COALESCE(ups.score, 0)";
        } else {
            // เมื่อผู้ใช้เข้าสู่ระบบครั้งแรก (ยังไม่มีประวัติ) ให้เรียงตามคะแนนน้ำหนักความสนใจหมวดหมู่ที่ระบุตอน Onboarding
            $scoreSql = "COALESCE(
                (SELECT SUM(ui_interest.weight) 
                 FROM tourism_types tt_interest
                 INNER JOIN user_interests ui_interest ON tt_interest.category_id = ui_interest.category_id
                 WHERE tt_interest.place_id = p.id AND ui_interest.user_id = " . (int)$userId . "),
                0
            )";
        }

        // 3. คำนวณสล็อตของฟีดแบบ 70/20/10 โดยอิงตามจำนวนที่ต้องสร้างทั้งหมด (limit + offset)
        $totalToGenerate = $limit + $offset;
        $numTop          = (int) round($totalToGenerate * 0.70);
        $numSecond       = (int) round($totalToGenerate * 0.20);
        $numUnseen       = $totalToGenerate - $numTop - $numSecond;

        $usedIds = [];

        // ─── GROUP 1 (70%): Top Category ────────────────────────────
        // ดึงหมวดหมู่ที่ผู้ใช้มีคะแนนความสนใจสูงสุด (Top Category) จาก user_preferences
        $topCatStmt = $this->pdo->prepare("
            SELECT category_id FROM user_preferences
            WHERE user_id = :user_id AND preference_score > 0
            ORDER BY preference_score DESC
            LIMIT 1
        ");
        $topCatStmt->execute([':user_id' => $userId]);
        $topCategoryId = $topCatStmt->fetchColumn();

        $topCategoryPlaceIds = [];
        if ($topCategoryId) {
            $stmt = $this->pdo->prepare("
                SELECT p.id
                FROM places p
                INNER JOIN tourism_types tt ON p.id = tt.place_id
                WHERE tt.category_id = :category_id
                  AND p.province IS NOT NULL AND TRIM(p.province) != ''
                  AND p.id NOT IN (
                      SELECT place_id FROM user_signals WHERE user_id = :user_id2 AND signal_type = 'dismiss'
                  )
                ORDER BY RAND()
                LIMIT :limit
            ");
            $stmt->bindValue(':category_id', $topCategoryId, PDO::PARAM_INT);
            $stmt->bindValue(':user_id2', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $totalToGenerate * 2, PDO::PARAM_INT);
            $stmt->execute();
            $topCategoryPlaceIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // ─── GROUP 2 (20%): Second Category ──────────────────────────
        // ดึงหมวดหมู่ที่มีคะแนนความสนใจเป็นอันดับถัดมา (อันดับที่ 2) จาก user_preferences
        $secondCatStmt = $this->pdo->prepare("
            SELECT category_id FROM user_preferences
            WHERE user_id = :user_id AND preference_score > 0
            ORDER BY preference_score DESC
            LIMIT 1 OFFSET 1
        ");
        $secondCatStmt->execute([':user_id' => $userId]);
        $secondCategoryId = $secondCatStmt->fetchColumn();

        if (!$secondCategoryId) {
            // หากไม่มีอันดับสอง ให้เลือกหมวดหมู่อื่นที่ไม่ใช่หมวดหมู่แรกมาหนึ่งหมวดหมู่ (ถ้ามี)
            $otherCatStmt = $this->pdo->prepare("
                SELECT id FROM categories
                WHERE id != :top_id
                ORDER BY id ASC
                LIMIT 1
            ");
            $otherCatStmt->execute([':top_id' => $topCategoryId ?: 0]);
            $secondCategoryId = $otherCatStmt->fetchColumn();
        }

        $secondCategoryPlaceIds = [];
        if ($secondCategoryId) {
            $stmt = $this->pdo->prepare("
                SELECT p.id
                FROM places p
                INNER JOIN tourism_types tt ON p.id = tt.place_id
                WHERE tt.category_id = :category_id
                  AND p.province IS NOT NULL AND TRIM(p.province) != ''
                  AND p.id NOT IN (
                      SELECT place_id FROM user_signals WHERE user_id = :user_id2 AND signal_type = 'dismiss'
                  )
                ORDER BY RAND()
                LIMIT :limit
            ");
            $stmt->bindValue(':category_id', $secondCategoryId, PDO::PARAM_INT);
            $stmt->bindValue(':user_id2', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $totalToGenerate * 2, PDO::PARAM_INT);
            $stmt->execute();
            $secondCategoryPlaceIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // ─── GROUP 3 (10%): Discovery (Unseen Categories) ───────────
        $unseenCatsStmt = $this->pdo->prepare("
            SELECT c.id FROM categories c
            LEFT JOIN user_preferences up ON c.id = up.category_id AND up.user_id = :user_id
            WHERE up.category_id IS NULL OR COALESCE(up.interacted_count, 0) = 0
        ");
        $unseenCatsStmt->execute([':user_id' => $userId]);
        $unseenCategoryIds = $unseenCatsStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($unseenCategoryIds)) {
            $leastStmt = $this->pdo->prepare("
                SELECT category_id FROM user_preferences
                WHERE user_id = :user_id
                ORDER BY interacted_count ASC, preference_score ASC
            ");
            $leastStmt->execute([':user_id' => $userId]);
            $unseenCategoryIds = $leastStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        if (empty($unseenCategoryIds)) {
            $unseenCategoryIds = $this->pdo->query("SELECT id FROM categories")->fetchAll(PDO::FETCH_COLUMN);
        }

        $unseenCategoryPlaceIds = [];
        if (!empty($unseenCategoryIds)) {
            // สุ่มเลือกหมวดหมู่ที่ยังไม่เคยดูมา 2 หมวดหมู่ก่อน เพื่อไม่ให้หมวดที่มีจำนวนสถานที่เยอะ (เช่น ธรรมชาติ) กินพื้นที่ทั้งหมด
            $selectedCats = [];
            if (count($unseenCategoryIds) <= 2) {
                $selectedCats = $unseenCategoryIds;
            } else {
                $randKeys = array_rand($unseenCategoryIds, 2);
                foreach ((array)$randKeys as $k) {
                    $selectedCats[] = $unseenCategoryIds[$k];
                }
            }

            $catPlaceholders = implode(',', array_fill(0, count($selectedCats), '?'));
            $stmt = $this->pdo->prepare("
                SELECT DISTINCT p.id
                FROM places p
                INNER JOIN tourism_types tt ON p.id = tt.place_id
                WHERE tt.category_id IN ($catPlaceholders)
                  AND p.province IS NOT NULL AND TRIM(p.province) != ''
                  AND p.id NOT IN (
                      SELECT place_id FROM user_signals WHERE user_id = ? AND signal_type = 'dismiss'
                  )
                ORDER BY RAND()
                LIMIT " . (int)($totalToGenerate * 2) . "
            ");
            $queryParams = array_merge($selectedCats, [$userId]);
            $stmt->execute($queryParams);
            $unseenCategoryPlaceIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // ─── FALLBACK: General Recommendations ───────────────────────
        $stmt = $this->pdo->prepare("
            SELECT p.id
            FROM places p
            LEFT JOIN user_place_scores ups ON p.id = ups.place_id AND ups.user_id = :user_id
            WHERE p.province IS NOT NULL AND TRIM(p.province) != ''
              AND p.id NOT IN (
                SELECT place_id FROM user_signals WHERE user_id = :user_id2 AND signal_type = 'dismiss'
            )
            ORDER BY $scoreSql DESC, p.place_name ASC
            LIMIT :limit
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id2', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $totalToGenerate * 2, PDO::PARAM_INT);
        $stmt->execute();
        $fallbackPlaceIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // ─── SELECT IDs per Group ────────────────────────────────────
        // 1) หมวดหมู่หลัก (70%)
        $topList = [];
        foreach ($topCategoryPlaceIds as $pid) {
            $pid = (int) $pid;
            if (count($topList) >= $numTop) break;
            if (!in_array($pid, $usedIds, true)) {
                $topList[] = $pid;
                $usedIds[] = $pid;
            }
        }

        // 2) หมวดหมู่รองอันดับสอง (20%)
        $secondList = [];
        foreach ($secondCategoryPlaceIds as $pid) {
            $pid = (int) $pid;
            if (count($secondList) >= $numSecond) break;
            if (!in_array($pid, $usedIds, true)) {
                $secondList[] = $pid;
                $usedIds[]    = $pid;
            }
        }

        // 3) ค้นพบสิ่งใหม่ (10%)
        $unseenList = [];
        foreach ($unseenCategoryPlaceIds as $pid) {
            $pid = (int) $pid;
            if (count($unseenList) >= $numUnseen) break;
            if (!in_array($pid, $usedIds, true)) {
                $unseenList[] = $pid;
                $usedIds[]    = $pid;
            }
        }

        // 4) Backfill แต่ละกลุ่มหากแคนดิเดตมีไม่เพียงพอ
        $fallbackIndex = 0;
        
        while (count($topList) < $numTop && $fallbackIndex < count($fallbackPlaceIds)) {
            $pid = (int) $fallbackPlaceIds[$fallbackIndex++];
            if (!in_array($pid, $usedIds, true)) {
                $topList[] = $pid;
                $usedIds[] = $pid;
            }
        }
        
        while (count($secondList) < $numSecond && $fallbackIndex < count($fallbackPlaceIds)) {
            $pid = (int) $fallbackPlaceIds[$fallbackIndex++];
            if (!in_array($pid, $usedIds, true)) {
                $secondList[] = $pid;
                $usedIds[]    = $pid;
            }
        }
        
        while (count($unseenList) < $numUnseen && $fallbackIndex < count($fallbackPlaceIds)) {
            $pid = (int) $fallbackPlaceIds[$fallbackIndex++];
            if (!in_array($pid, $usedIds, true)) {
                $unseenList[] = $pid;
                $usedIds[]    = $pid;
            }
        }

        // ─── FETCH DETAILS & SORT ────────────────────────────────────
        $topDetails    = $this->fetchPlaceDetails($topList, $userId, $topProvinces, $scoreSql);
        $secondDetails = $this->fetchPlaceDetails($secondList, $userId, $topProvinces, $scoreSql);
        $unseenDetails = $this->fetchPlaceDetails($unseenList, $userId, $topProvinces, $scoreSql);

        // เรียงตามลำดับของ $topList ซึ่งได้มาแบบสุ่ม (RAND()) แทนการเรียงตามคะแนนความนิยม
        $topListOrder = array_flip($topList);
        usort($topDetails,    static fn($a, $b) => ($topListOrder[$a['id']] ?? 0) <=> ($topListOrder[$b['id']] ?? 0));

        // เรียงตามลำดับของ $secondList ซึ่งได้มาแบบสุ่ม (RAND()) แทนการเรียงตามคะแนนความนิยม
        $secondListOrder = array_flip($secondList);
        usort($secondDetails, static fn($a, $b) => ($secondListOrder[$a['id']] ?? 0) <=> ($secondListOrder[$b['id']] ?? 0));

        usort($unseenDetails, static fn($a, $b) => $b['score'] <=> $a['score']);

        // ─── INTERLEAVE 7:2:1 RATIO ──────────────────────────────────
        $finalPlaces = [];
        $i = 0; $j = 0; $k = 0;
        
        while (
            $i < count($topDetails) || 
            $j < count($secondDetails) || 
            $k < count($unseenDetails)
        ) {
            // ดึง Top Category (7)
            for ($x = 0; $x < 7; $x++) {
                if (isset($topDetails[$i])) {
                    $finalPlaces[] = $topDetails[$i++];
                }
            }
            // ดึง Second Category (2)
            for ($x = 0; $x < 2; $x++) {
                if (isset($secondDetails[$j])) {
                    $finalPlaces[] = $secondDetails[$j++];
                }
            }
            // ดึง Discovery (1)
            if (isset($unseenDetails[$k])) {
                $finalPlaces[] = $unseenDetails[$k++];
            }
        }

        // ตัดแบ่งหน้าตาความกว้างหน้าของ Pagination
        $paginatedPlaces = array_slice($finalPlaces, $offset, $limit);

        return [
            'success' => true,
            'data'    => $paginatedPlaces,
            'limit'   => $limit,
            'offset'  => $offset,
            'count'   => count($paginatedPlaces),
        ];
    }

    private function fetchPlaceDetails(array $placeIds, int $userId, array $topProvinces, string $scoreSql): array
    {
        if (empty($placeIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($placeIds), '?'));
        
        $inProvinces = !empty($topProvinces)
            ? implode(',', array_fill(0, count($topProvinces), '?'))
            : "'__none__'";

        $sql = "
            SELECT
                p.id,
                p.place_name,
                p.description,
                p.province,
                p.district,
                p.subdistrict,
                p.image_url,
                p.latitude,
                p.longitude,
                ROUND(
                    $scoreSql +
                    (CASE WHEN p.province IN ($inProvinces) THEN 2.5 ELSE 0 END),
                    2
                ) AS score,
                GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.id SEPARATOR ',') AS categories,
                GROUP_CONCAT(DISTINCT c.id            ORDER BY c.id SEPARATOR ',') AS category_ids
            FROM places p
            LEFT JOIN user_place_scores ups ON p.id = ups.place_id AND ups.user_id = ?
            LEFT JOIN tourism_types tt ON tt.place_id = p.id
            LEFT JOIN categories c ON c.id = tt.category_id
            WHERE p.id IN ($placeholders)
            GROUP BY p.id
        ";

        $queryParams = array_merge(
            !empty($topProvinces) ? $topProvinces : [],
            [$userId],
            $placeIds
        );

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($queryParams);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format fields
        foreach ($rows as &$place) {
            $place['id']           = (int)   $place['id'];
            $place['score']        = (float) $place['score'];
            $place['latitude']     = $place['latitude']  ? (float) $place['latitude']  : null;
            $place['longitude']    = $place['longitude'] ? (float) $place['longitude'] : null;
            $place['categories']   = $place['categories'] ? explode(',', $place['categories']) : [];
            $place['category_ids'] = $place['category_ids'] ? array_map('intval', explode(',', $place['category_ids'])) : [];
        }
        unset($place);

        return $rows;
    }
}
