<?php

class SignalController
{
    private PDO $pdo;
    private ScoreService $scoreService;

    // Weight added to matching category interests for each positive signal
    private const WEIGHT_BOOSTS = [
        'view' => 1.0,
        'like' => 2.0,
        'save' => 3.0,
        'share' => 1.5,
    ];

    // เกณฑ์การรับชมเพื่อรับโบนัสแนะนำเฉพาะบุคคลเพิ่มเติม
    private const VIEW_THRESHOLD = 3;     // เมื่อดูสถานที่ในหมวดเดิมครบ 3 ครั้ง
    private const THRESHOLD_BOOST = 5.0;   // เพิ่มน้ำหนักพิเศษ +5.0 ดันขึ้นหน้าแนะนำทันที

    private const VALID_SIGNALS = ['view', 'like', 'save', 'share', 'dismiss'];

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->scoreService = new ScoreService($pdo);
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

    private function upsertUserInteraction(
        int $userId,
        int $placeId,
        ?int $hasShared,
        ?int $hasSaved,
        ?int $hasLiked,
        int $dwellAdd = 0,
        int $clickAdd = 0
    ): void {
        $stmt = $this->pdo->prepare(
            'INSERT INTO user_interactions
                (user_id, place_id, has_shared, has_saved, has_liked, total_dwell_time, click_count, last_action_at)
             VALUES
                (:user_id, :place_id, COALESCE(:has_shared_i, 0), COALESCE(:has_saved_i, 0), COALESCE(:has_liked_i, 0), :dwell_i, :click_i, NOW())
             ON DUPLICATE KEY UPDATE
                has_shared = COALESCE(:has_shared_u, has_shared),
                has_saved = COALESCE(:has_saved_u, has_saved),
                has_liked = COALESCE(:has_liked_u, has_liked),
                total_dwell_time = GREATEST(0, COALESCE(total_dwell_time, 0) + :dwell_u),
                click_count = GREATEST(0, COALESCE(click_count, 0) + :click_u),
                last_action_at = NOW()'
        );

        $stmt->execute([
            ':user_id' => $userId,
            ':place_id' => $placeId,
            ':has_shared_i' => $hasShared,
            ':has_saved_i' => $hasSaved,
            ':has_liked_i' => $hasLiked,
            ':dwell_i' => max(0, $dwellAdd),
            ':click_i' => max(0, $clickAdd),
            ':has_shared_u' => $hasShared,
            ':has_saved_u' => $hasSaved,
            ':has_liked_u' => $hasLiked,
            ':dwell_u' => max(0, $dwellAdd),
            ':click_u' => max(0, $clickAdd),
        ]);
    }

    private function syncUserPreferenceScore(int $userId, int $categoryId, float $scoreDelta = 0.0, int $interactionDelta = 0): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO user_preferences (user_id, category_id, preference_score, interacted_count, updated_at)
             VALUES (:user_id, :category_id, GREATEST(1.00, :score_seed), GREATEST(0, :interaction_seed), NOW())
             ON DUPLICATE KEY UPDATE
                preference_score = GREATEST(1.00, COALESCE(preference_score, 1.00) + :score_delta),
                interacted_count = GREATEST(0, COALESCE(interacted_count, 0) + :interaction_delta),
                updated_at = NOW()'
        );

        $stmt->execute([
            ':user_id' => $userId,
            ':category_id' => $categoryId,
            ':score_seed' => max(1.0, 1.0 + $scoreDelta),
            ':interaction_seed' => max(0, $interactionDelta),
            ':score_delta' => $scoreDelta,
            ':interaction_delta' => $interactionDelta,
        ]);
    }

    /**
     * POST /api/signals
     * Body: { place_id: int, signal_type: string, duration_seconds?: int, platform?: string, duration_only?: bool }
     *
     * - Logs the event in user_signals
     * - Upserts & boosts user_interests.weight for matching categories
     * - Checks VIEW_THRESHOLD (e.g. 3 views in category) -> applies THRESHOLD_BOOST (+5.0)
     * - Inserts into user_dismissed for 'dismiss'
     */
    public function store(array $params, array $body): array
    {
        $userId = $this->requireAuth();
        $placeId = (int) ($body['place_id'] ?? 0);
        $signalType = trim($body['signal_type'] ?? '');
        $platform = isset($body['platform']) ? trim((string) $body['platform']) : null;
        $durationSeconds = isset($body['duration_seconds']) ? max(0, (int) $body['duration_seconds']) : null;
        $durationOnly = !empty($body['duration_only']);

        if (!$placeId || !in_array($signalType, self::VALID_SIGNALS, true)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'ข้อมูล signal ไม่ถูกต้อง'];
        }

        // Duration update mode: update latest view row only, do not alter weights or scores.
        if (
            $signalType === 'view'
            && $durationOnly
            && $durationSeconds !== null
        ) {
            try {
                $findStmt = $this->pdo->prepare(
                    'SELECT id
                     FROM user_signals
                     WHERE user_id = ? AND place_id = ? AND signal_type = ?
                     ORDER BY created_at DESC, id DESC
                     LIMIT 1'
                );
                $findStmt->execute([$userId, $placeId, 'view']);
                $latestId = (int) ($findStmt->fetchColumn() ?: 0);

                if ($latestId > 0) {
                    $updStmt = $this->pdo->prepare(
                        'UPDATE user_signals
                         SET duration_seconds = ?,
                             platform = COALESCE(?, platform)
                         WHERE id = ?'
                    );
                    $updStmt->execute([$durationSeconds, $platform, $latestId]);

                    $this->upsertUserInteraction($userId, $placeId, null, null, null, $durationSeconds, 0);

                    return ['success' => true, 'action' => 'duration_updated'];
                }

                // Do not create a new view row in duration-only mode.
                // This prevents view count inflation that would skew recommendations.
                $this->upsertUserInteraction($userId, $placeId, null, null, null, $durationSeconds, 0);
                return ['success' => true, 'action' => 'duration_skipped_no_view'];
            } catch (\Exception $e) {
                http_response_code(500);
                return ['success' => false, 'message' => 'เกิดข้อผิดพลาด กรุณาลองใหม่'];
            }
        }

        $this->pdo->beginTransaction();
        try {
            // 0. Check if like or save exists and toggle delete if it does
            if (in_array($signalType, ['like', 'save'], true)) {
                $checkStmt = $this->pdo->prepare(
                    'SELECT id FROM user_signals WHERE user_id = ? AND place_id = ? AND signal_type = ? LIMIT 1'
                );
                $checkStmt->execute([$userId, $placeId, $signalType]);
                $existingSignal = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($existingSignal) {
                    // Delete the signal
                    $delStmt = $this->pdo->prepare('DELETE FROM user_signals WHERE id = ?');
                    $delStmt->execute([$existingSignal['id']]);

                    if ($signalType === 'like') {
                        $this->upsertUserInteraction($userId, $placeId, null, null, 0, 0, 0);
                    }
                    if ($signalType === 'save') {
                        $this->upsertUserInteraction($userId, $placeId, null, 0, null, 0, 0);
                    }

                    // Decrement weight in user_interests for each category of this place
                    $catStmt = $this->pdo->prepare('SELECT category_id FROM tourism_types WHERE place_id = ?');
                    $catStmt->execute([$placeId]);
                    $categoryIds = $catStmt->fetchAll(PDO::FETCH_COLUMN);

                    if (isset(self::WEIGHT_BOOSTS[$signalType]) && !empty($categoryIds)) {
                        $boost = self::WEIGHT_BOOSTS[$signalType];
                        foreach ($categoryIds as $catId) {
                            $decStmt = $this->pdo->prepare("
                                UPDATE user_interests 
                                SET weight = GREATEST(1.00, weight - :boost),
                                    updated_at = NOW()
                                WHERE user_id = :user_id AND category_id = :category_id
                            ");
                            $decStmt->execute([
                                ':user_id' => $userId,
                                ':category_id' => $catId,
                                ':boost' => $boost,
                            ]);

                            $this->syncUserPreferenceScore($userId, (int) $catId, -1 * (float) $boost, 0);
                        }
                    }

                    $this->pdo->commit();

                    // Recalculate stored score for this place after unlike/unsave
                    $this->scoreService->recalcPlace($userId, $placeId);

                    return ['success' => true, 'action' => 'removed'];
                }
            }

            // 1. บันทึก Signal ลงใน user_signals
            $ins = $this->pdo->prepare(
                'INSERT INTO user_signals (user_id, place_id, signal_type, platform, duration_seconds) VALUES (?, ?, ?, ?, ?)'
            );
            $ins->execute([$userId, $placeId, $signalType, $platform, $durationSeconds]);

            if ($signalType === 'view') {
                $this->upsertUserInteraction($userId, $placeId, null, null, null, 0, 1);
            }
            if ($signalType === 'share') {
                $this->upsertUserInteraction($userId, $placeId, 1, null, null, 0, 0);
            }
            if ($signalType === 'like') {
                $this->upsertUserInteraction($userId, $placeId, null, null, 1, 0, 0);
            }
            if ($signalType === 'save') {
                $this->upsertUserInteraction($userId, $placeId, null, 1, null, 0, 0);
            }

            // 2. ดึงหมวดหมู่ทั้งหมดของสถานที่นี้
            $catStmt = $this->pdo->prepare('SELECT category_id FROM tourism_types WHERE place_id = ?');
            $catStmt->execute([$placeId]);
            $categoryIds = $catStmt->fetchAll(PDO::FETCH_COLUMN);

            // 3. ปรับปรุง/เพิ่มน้ำหนักใน user_interests สำหรับหมวดหมู่ของสถานที่นี้
            if (isset(self::WEIGHT_BOOSTS[$signalType]) && !empty($categoryIds)) {
                $boost = self::WEIGHT_BOOSTS[$signalType];

                foreach ($categoryIds as $catId) {
                    if ($signalType === 'view') {
                        // 4. หากเป็น Signal 'view' -> นับจำนวนครั้งที่กดเข้าดูสถานที่ในหมวดหมู่นี้
                        $countStmt = $this->pdo->prepare("
                            SELECT COUNT(DISTINCT us.id)
                            FROM user_signals us
                            INNER JOIN tourism_types tt ON tt.place_id = us.place_id
                            WHERE us.user_id     = :user_id
                              AND us.signal_type = 'view'
                              AND tt.category_id = :category_id
                        ");
                        $countStmt->execute([
                            ':user_id' => $userId,
                            ':category_id' => $catId,
                        ]);
                        $viewCount = (int) $countStmt->fetchColumn();

                        // ทำงานเมื่อกดดูถึงเกณฑ์ ( Threshold >= 3 ครั้ง ) เท่านั้น! (ไม่ให้เข้าดูครั้งเดียวแล้วขึ้นเลย)
                        if ($viewCount >= self::VIEW_THRESHOLD && ($viewCount % self::VIEW_THRESHOLD) === 0) {
                            $upsertStmt = $this->pdo->prepare("
                                INSERT INTO user_interests (user_id, category_id, weight)
                                VALUES (:user_id, :category_id, :threshold_boost)
                                ON DUPLICATE KEY UPDATE
                                    weight     = weight + :threshold_boost_update,
                                    updated_at = NOW()
                            ");
                            $upsertStmt->execute([
                                ':user_id' => $userId,
                                ':category_id' => $catId,
                                ':threshold_boost' => self::THRESHOLD_BOOST,
                                ':threshold_boost_update' => self::THRESHOLD_BOOST,
                            ]);

                            $this->syncUserPreferenceScore($userId, (int) $catId, self::THRESHOLD_BOOST, 1);
                        } else {
                            $this->syncUserPreferenceScore($userId, (int) $catId, 0.0, 1);
                        }
                    } else {
                        // สำหรับ Signal ที่เป็นการกระทำโดยตรง (like, save, share) -> เพิ่มค่าน้ำหนักทันที
                        $upsertStmt = $this->pdo->prepare("
                            INSERT INTO user_interests (user_id, category_id, weight)
                            VALUES (:user_id, :category_id, :boost)
                            ON DUPLICATE KEY UPDATE
                                weight     = weight + :boost_update,
                                updated_at = NOW()
                        ");
                        $upsertStmt->execute([
                            ':user_id' => $userId,
                            ':category_id' => $catId,
                            ':boost' => $boost,
                            ':boost_update' => $boost,
                        ]);

                        $this->syncUserPreferenceScore($userId, (int) $catId, (float) $boost, 1);
                    }
                }
            }

            // 5. หากเป็น signalประเภท 'dismiss' -> บันทึกลง user_dismissed
            if ($signalType === 'dismiss') {
                $dis = $this->pdo->prepare(
                    'INSERT IGNORE INTO user_dismissed (user_id, place_id) VALUES (?, ?)'
                );
                $dis->execute([$userId, $placeId]);
            }

            $this->pdo->commit();
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'message' => 'เกิดข้อผิดพลาด กรุณาลองใหม่'];
        }

        // Recalculate stored score for this place after any positive signal
        if ($signalType !== 'dismiss') {
            $this->scoreService->recalcPlace($userId, $placeId);
        }

        return ['success' => true, 'action' => 'added'];
    }
}
