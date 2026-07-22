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
     * Smart Hybrid Recommendation & Diversity Interleaving Algorithm:
     * 1. Base Score: SUM(user_interests.weight) จากหมวดหมู่ที่สนใจ
     * 2. Location Similarity Bonus (+2.5): เพิ่มคะแนนสถานที่ในจังหวัดที่ผู้ใช้เข้าดูบ่อยล่าสุด (เช่น ร้อยเอ็ด)
     * 3. Diversity Interleaving (คละหมวดหมู่แบบสมดุล):
     *    แบ่งกลุ่มสถานที่ตามหมวดหมู่ แล้วดึงสลับกัน (เช่น สวนสัตว์ 2 แห่ง ➔ ถ่ายภาพ 2 แห่ง ➔ ธรรมชาติ 2 แห่ง)
     *    ป้องกันไม่ให้หน้าแนะนำมีแต่หมวดเดิมซ้ำซาก 100% แต่สอดแทรกสถานที่ใกล้เคียงและหมวดหมู่อื่นที่สนใจลงไปด้วย
     */
    public function index(array $params, array $body): array
    {
        $userId = $this->requireAuth();
        $limit  = min((int) ($params['limit']  ?? 24), 50);
        $offset = max((int) ($params['offset'] ?? 0),  0);

        // 1. ดึงจังหวัดที่ผู้ใช้เข้าดูซ้ำจนถึงเกณฑ์ (อย่างน้อย 3 ครั้ง)
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

        // 2. ดึงรายการสถานที่ที่ผู้ใช้เข้าดูซ้ำจนถึงเกณฑ์ (อย่างน้อย 3 ครั้ง) เท่านั้น! (ไม่ใช่ดูครั้งเดียวแล้วขึ้นเลย)
        $viewedStmt = $this->pdo->prepare("
            SELECT place_id, COUNT(*) as cnt
            FROM user_signals
            WHERE user_id = :user_id AND signal_type = 'view'
            GROUP BY place_id
            HAVING cnt >= 3
        ");
        $viewedStmt->execute([':user_id' => $userId]);
        $viewedPlaceIds = $viewedStmt->fetchAll(PDO::FETCH_COLUMN);

        // 3. คำนวณคะแนนสถานที่ (Base Score + Direct View Bonus + Location Similarity Bonus)
        $inProvinces = !empty($topProvinces)
            ? implode(',', array_fill(0, count($topProvinces), '?'))
            : "'__none__'";

        $inViewed = !empty($viewedPlaceIds)
            ? implode(',', array_fill(0, count($viewedPlaceIds), '?'))
            : '0';

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
                    SUM(ui.weight) +
                    (CASE WHEN p.id IN ($inViewed) THEN 4.0 ELSE 0 END) +
                    (CASE WHEN p.province IN ($inProvinces) THEN 2.5 ELSE 0 END),
                    2
                ) AS score,
                GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.id SEPARATOR ',') AS categories,
                GROUP_CONCAT(DISTINCT c.id            ORDER BY c.id SEPARATOR ',') AS category_ids

            FROM places p
            INNER JOIN tourism_types  tt ON tt.place_id   = p.id
            INNER JOIN categories      c ON c.id          = tt.category_id
            INNER JOIN user_interests ui ON ui.category_id = tt.category_id
                                        AND ui.user_id     = ?
            WHERE p.id NOT IN (
                SELECT place_id
                FROM user_dismissed
                WHERE user_id = ?
            )
            GROUP BY p.id
            ORDER BY score DESC, p.place_name ASC
            LIMIT 150
        ";

        $queryParams = array_merge(
            !empty($viewedPlaceIds) ? $viewedPlaceIds : [],
            !empty($topProvinces) ? $topProvinces : [],
            [$userId, $userId]
        );

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($queryParams);
        $rawPlaces = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format ข้อมูลเป็น Types ที่ถูกต้อง
        foreach ($rawPlaces as &$place) {
            $place['id']           = (int)   $place['id'];
            $place['score']        = (float) $place['score'];
            $place['latitude']     = $place['latitude']  ? (float) $place['latitude']  : null;
            $place['longitude']    = $place['longitude'] ? (float) $place['longitude'] : null;
            $place['categories']   = $place['categories']
                ? explode(',', $place['categories'])
                : [];
            $place['category_ids'] = $place['category_ids']
                ? array_map('intval', explode(',', $place['category_ids']))
                : [];
        }
        unset($place);

        // 3. Diversity Interleaving Algorithm (คละหมวดหมู่อย่างสมดุล)
        // จัดกลุ่มตามหมวดหมู่หลัก แล้วดึงสลับกันเพื่อไม่ให้หมวดใดหมวดหนึ่งกินพื้นที่ทั้งหมด
        $categoryBuckets = [];
        foreach ($rawPlaces as $place) {
            $primaryCat = $place['category_ids'][0] ?? 0;
            if (!isset($categoryBuckets[$primaryCat])) {
                $categoryBuckets[$primaryCat] = [];
            }
            $categoryBuckets[$primaryCat][] = $place;
        }

        // ดึงวนสลับหมวดหมู่ (Round-Robin) เช่น หมวด A 2 แห่ง ➔ หมวด B 2 แห่ง ➔ หมวด C 2 แห่ง...
        $mixedPlaces = [];
        $hasItems = true;
        while ($hasItems && count($mixedPlaces) < 150) {
            $hasItems = false;
            foreach ($categoryBuckets as $catId => &$bucket) {
                if (!empty($bucket)) {
                    $take = array_splice($bucket, 0, 2);
                    foreach ($take as $item) {
                        $mixedPlaces[] = $item;
                    }
                    if (!empty($bucket)) {
                        $hasItems = true;
                    }
                }
            }
        }

        // 4. ตัดแบ่งหน้า (Pagination: limit & offset)
        $paginatedPlaces = array_slice($mixedPlaces, $offset, $limit);

        return [
            'success' => true,
            'data'    => $paginatedPlaces,
            'limit'   => $limit,
            'offset'  => $offset,
            'count'   => count($paginatedPlaces),
        ];
    }
}
