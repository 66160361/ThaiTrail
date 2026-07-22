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
     * - Boosts user_interests.weight for positive signals (like/save/share)
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
            // Log the signal
            $ins = $this->pdo->prepare(
                'INSERT INTO user_signals (user_id, place_id, signal_type) VALUES (?, ?, ?)'
            );
            $ins->execute([$userId, $placeId, $signalType]);

            // Boost category weights for positive signals
            if (isset(self::WEIGHT_BOOSTS[$signalType])) {
                $boost = self::WEIGHT_BOOSTS[$signalType];
                $boost_stmt = $this->pdo->prepare("
                    UPDATE user_interests ui
                    INNER JOIN tourism_types tt ON tt.category_id = ui.category_id
                    SET ui.weight     = ui.weight + :boost,
                        ui.updated_at = NOW()
                    WHERE ui.user_id  = :user_id
                      AND tt.place_id = :place_id
                ");
                $boost_stmt->bindValue(':boost',    $boost,   PDO::PARAM_STR);
                $boost_stmt->bindValue(':user_id',  $userId,  PDO::PARAM_INT);
                $boost_stmt->bindValue(':place_id', $placeId, PDO::PARAM_INT);
                $boost_stmt->execute();
            }

            // Insert into dismissed table for 'dismiss' signal
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
