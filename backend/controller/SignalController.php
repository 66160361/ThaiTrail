<?php

class SignalController
{
    private PDO $pdo;
    private ScoreService $scoreService;

    // Weight added to matching category interests for each positive signal
    private const WEIGHT_BOOSTS = [
        'view'  => 1.0,
        'like'  => 2.0,
        'save'  => 3.0,
        'share' => 1.5,
    ];

    // เกณฑ์การรับชมเพื่อรับโบนัสแนะนำเฉพาะบุคคลเพิ่มเติม
    private const VIEW_THRESHOLD = 3;     // เมื่อดูสถานที่ในหมวดเดิมครบ 3 ครั้ง
    private const THRESHOLD_BOOST = 5.0;   // เพิ่มน้ำหนักพิเศษ +5.0 ดันขึ้นหน้าแนะนำทันที

    private const VALID_SIGNALS = ['view', 'like', 'save', 'share', 'dismiss'];

    public function __construct(PDO $pdo)
    {
        $this->pdo          = $pdo;
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

    /**
     * POST /api/signals
     * Body: { place_id: int, signal_type: string }
     *
     * - Logs the event in user_signals
     * - Upserts & boosts user_interests.weight for matching categories
     * - Checks VIEW_THRESHOLD (e.g. 3 views in category) -> applies THRESHOLD_BOOST (+5.0)
     */
    public function store(array $params, array $body): array
    {
        $userId          = $this->requireAuth();
        $placeId         = (int) ($body['place_id']          ?? 0);
        $signalType      = trim($body['signal_type']         ?? '');
        $durationSeconds = isset($body['duration_seconds']) ? (int) $body['duration_seconds'] : null;

        if (!$placeId || !in_array($signalType, self::VALID_SIGNALS, true)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'ข้อมูล signal ไม่ถูกต้อง'];
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
                                ':user_id'     => $userId,
                                ':category_id' => $catId,
                                ':boost'       => $boost,
                            ]);
                        }
                    }

                    $this->pdo->commit();

                    // Recalculate stored score for this place after unlike/unsave
                    $this->scoreService->recalcPlace($userId, $placeId);

                    return ['success' => true, 'action' => 'removed'];
                }
            }

            // 1. บันทึก Signal ลงใน user_signals (รวม duration_seconds)
            $ins = $this->pdo->prepare(
                'INSERT INTO user_signals (user_id, place_id, signal_type, duration_seconds) VALUES (?, ?, ?, ?)'
            );
            $ins->execute([$userId, $placeId, $signalType, $durationSeconds]);

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
                            ':user_id'     => $userId,
                            ':category_id' => $catId,
                        ]);
                        $viewCount = (int) $countStmt->fetchColumn();

                        // ⚠️ ทำงานเมื่อกดดูถึงเกณฑ์ ( Threshold >= 3 ครั้ง ) เท่านั้น! (ไม่ให้เข้าดูครั้งเดียวแล้วขึ้นเลย)
                        if ($viewCount >= self::VIEW_THRESHOLD && ($viewCount % self::VIEW_THRESHOLD) === 0) {
                            $upsertStmt = $this->pdo->prepare("
                                INSERT INTO user_interests (user_id, category_id, weight)
                                VALUES (:user_id, :category_id, :threshold_boost)
                                ON DUPLICATE KEY UPDATE
                                    weight     = weight + :threshold_boost_update,
                                    updated_at = NOW()
                            ");
                            $upsertStmt->execute([
                                ':user_id'                => $userId,
                                ':category_id'            => $catId,
                                ':threshold_boost'        => self::THRESHOLD_BOOST,
                                ':threshold_boost_update' => self::THRESHOLD_BOOST,
                            ]);
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
                            ':user_id'       => $userId,
                            ':category_id'   => $catId,
                            ':boost'         => $boost,
                            ':boost_update'  => $boost,
                        ]);
                    }
                }
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
