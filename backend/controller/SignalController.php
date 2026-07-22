<?php

class SignalController
{
    private PDO $pdo;

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
     * POST /api/signals
     * Body: { place_id: int, signal_type: string }
     *
     * - Logs the event in user_signals
     * - Upserts & boosts user_interests.weight for matching categories
     * - Checks VIEW_THRESHOLD (e.g. 3 views in category) -> applies THRESHOLD_BOOST (+5.0)
     * - Inserts into user_dismissed for 'dismiss'
     */
    public function store(array $params, array $body): array
    {
        $userId     = $this->requireAuth();
        $placeId    = (int) ($body['place_id']    ?? 0);
        $signalType = trim($body['signal_type']   ?? '');

        if (!$placeId || !in_array($signalType, self::VALID_SIGNALS, true)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'ข้อมูล signal ไม่ถูกต้อง'];
        }

        $this->pdo->beginTransaction();
        try {
            // 1. บันทึก Signal ลงใน user_signals
            $ins = $this->pdo->prepare(
                'INSERT INTO user_signals (user_id, place_id, signal_type) VALUES (?, ?, ?)'
            );
            $ins->execute([$userId, $placeId, $signalType]);

            // 2. ดึงหมวดหมู่ทั้งหมดของสถานที่นี้
            $catStmt = $this->pdo->prepare('SELECT category_id FROM tourism_types WHERE place_id = ?');
            $catStmt->execute([$placeId]);
            $categoryIds = $catStmt->fetchAll(PDO::FETCH_COLUMN);

            // 3. ปรับปรุง/เพิ่มน้ำหนักใน user_interests สำหรับทุกหมวดหมู่ของสถานที่นี้
            if (isset(self::WEIGHT_BOOSTS[$signalType]) && !empty($categoryIds)) {
                $boost = self::WEIGHT_BOOSTS[$signalType];

                $upsertStmt = $this->pdo->prepare("
                    INSERT INTO user_interests (user_id, category_id, weight)
                    VALUES (:user_id, :category_id, :boost)
                    ON DUPLICATE KEY UPDATE
                        weight     = weight + :boost_update,
                        updated_at = NOW()
                ");

                foreach ($categoryIds as $catId) {
                    $upsertStmt->bindValue(':user_id',       $userId,  PDO::PARAM_INT);
                    $upsertStmt->bindValue(':category_id',   $catId,   PDO::PARAM_INT);
                    $upsertStmt->bindValue(':boost',         $boost,   PDO::PARAM_STR);
                    $upsertStmt->bindValue(':boost_update',  $boost,   PDO::PARAM_STR);
                    $upsertStmt->execute();

                    // 4. ถ้าเป็น signal ประเภท 'view' -> ตรวจสอบว่าดูหมวดหมู่นี้ครบเกณฑ์ (Threshold) หรือยัง
                    if ($signalType === 'view') {
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

                        // เมื่อดูครบตามเกณฑ์ (เช่น 3 ครั้ง หรือทวีคูณของ 3 ครั้ง) ให้โบนัสพิเศษเพิ่มเติม
                        if ($viewCount > 0 && ($viewCount % self::VIEW_THRESHOLD) === 0) {
                            $milestoneStmt = $this->pdo->prepare("
                                UPDATE user_interests
                                SET weight     = weight + :threshold_boost,
                                    updated_at = NOW()
                                WHERE user_id     = :user_id
                                  AND category_id = :category_id
                            ");
                            $milestoneStmt->execute([
                                ':threshold_boost' => self::THRESHOLD_BOOST,
                                ':user_id'         => $userId,
                                ':category_id'     => $catId,
                            ]);
                        }
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

        return ['success' => true];
    }
}
