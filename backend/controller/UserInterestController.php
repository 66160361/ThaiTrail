<?php

class UserInterestController
{
    private PDO $pdo;
    private ScoreService $scoreService;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->scoreService = new ScoreService($pdo);
    }

    private function syncUserPreferences(int $userId, array $categoryIds): void
    {
        $deleteStmt = $this->pdo->prepare('DELETE FROM user_preferences WHERE user_id = ?');
        $deleteStmt->execute([$userId]);

        if (count($categoryIds) === 0) {
            return;
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT INTO user_preferences (user_id, category_id, preference_score, interacted_count, updated_at)
             VALUES (?, ?, 1.00, 0, NOW())'
        );

        foreach ($categoryIds as $categoryId) {
            $insertStmt->execute([$userId, $categoryId]);
        }
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

    /** GET /api/user/interests — return current interests */
    public function index(array $params, array $body): array
    {
        $userId = $this->requireAuth();

        $stmt = $this->pdo->prepare(
            'SELECT ui.category_id, c.category_name, ui.weight
             FROM user_interests ui
             JOIN categories c ON c.id = ui.category_id
             WHERE ui.user_id = ?
             ORDER BY ui.weight DESC, ui.category_id ASC'
        );
        $stmt->execute([$userId]);

        $interests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($interests as &$row) {
            $row['category_id'] = (int) $row['category_id'];
            $row['weight'] = (float) $row['weight'];
        }

        return ['success' => true, 'interests' => $interests];
    }

    /** POST /api/user/interests — save selected interests, mark onboarded=1 */
    public function store(array $params, array $body): array
    {
        $userId = $this->requireAuth();
        $categoryIds = $body['category_ids'] ?? [];

        if (empty($categoryIds) || !is_array($categoryIds)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'กรุณาเลือกอย่างน้อย 1 ความสนใจ'];
        }

        // Validate that all IDs are positive integers and remove duplicates
        $categoryIds = array_values(array_unique(array_filter(array_map('intval', $categoryIds), static fn($id) => $id > 0)));

        if (count($categoryIds) === 0) {
            http_response_code(400);
            return ['success' => false, 'message' => 'หมวดหมู่ที่เลือกไม่ถูกต้อง'];
        }

        // Ensure selected category IDs exist in categories table
        $placeholders = implode(',', array_fill(0, count($categoryIds), '?'));
        $validateStmt = $this->pdo->prepare("SELECT id FROM categories WHERE id IN ($placeholders)");
        $validateStmt->execute($categoryIds);
        $validIds = array_map('intval', $validateStmt->fetchAll(PDO::FETCH_COLUMN));

        if (count($validIds) !== count($categoryIds)) {
            $invalidIds = array_values(array_diff($categoryIds, $validIds));
            http_response_code(400);
            return [
                'success' => false,
                'message' => 'ไม่พบหมวดหมู่บางรายการในระบบ',
                'invalid_category_ids' => $invalidIds,
            ];
        }

        $this->pdo->beginTransaction();
        try {
            // Remove old interests
            $del = $this->pdo->prepare('DELETE FROM user_interests WHERE user_id = ?');
            $del->execute([$userId]);

            // Insert new interests at weight 1.00
            $ins = $this->pdo->prepare(
                'INSERT INTO user_interests (user_id, category_id, weight) VALUES (?, ?, 1.00)'
            );
            foreach ($validIds as $catId) {
                $ins->execute([$userId, $catId]);
            }

            $this->syncUserPreferences($userId, $validIds);

            // Mark user as onboarded
            $upd = $this->pdo->prepare('UPDATE users SET onboarded = 1 WHERE id = ?');
            $upd->execute([$userId]);

            $this->pdo->commit();
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'message' => 'เกิดข้อผิดพลาด กรุณาลองใหม่'];
        }

        // Recompute and persist scores for all matching places now that interests changed
        $this->scoreService->recalcAll($userId);

        return [
            'success' => true,
            'message' => 'บันทึกความสนใจเรียบร้อยแล้ว',
            'saved_category_ids' => $validIds,
        ];
    }
}
