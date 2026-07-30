<?php

/**
 * ScoreService — Pre-computes and persists recommendation scores in user_place_scores.
 *
 * Score stored = SUM(user_interests.weight for matching categories) + view_bonus
 * Province bonus (+2.5) is computed at query time (changes on every view).
 *
 * VIEW_BONUS (+4.0) is applied when user has viewed this specific place >= 3 times.
 */
class ScoreService
{
    private PDO $pdo;

    private const VIEW_THRESHOLD = 3;
    private const VIEW_BONUS     = 4.0;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Recalculate and persist score for ONE specific (user, place) pair.
     * Called on every signal (view/like/save/share/unlike/unsave).
     */
    public function recalcPlace(int $userId, int $placeId): void
    {
        // Check view count for this place
        $viewStmt = $this->pdo->prepare('
            SELECT COUNT(*) FROM user_signals
            WHERE user_id = ? AND place_id = ? AND signal_type = \'view\'
        ');
        $viewStmt->execute([$userId, $placeId]);
        $viewCount  = (int) $viewStmt->fetchColumn();
        $viewBonus  = ($viewCount >= self::VIEW_THRESHOLD) ? self::VIEW_BONUS : 0.0;

        // Calculate interest score: SUM of user's weights for this place's categories
        $scoreStmt = $this->pdo->prepare('
            SELECT ROUND(COALESCE(SUM(ui.weight), 0) + :view_bonus, 2) AS score
            FROM places p
            INNER JOIN tourism_types  tt ON tt.place_id   = p.id
            INNER JOIN user_interests ui ON ui.category_id = tt.category_id
                                        AND ui.user_id     = :user_id
            WHERE p.id = :place_id
            GROUP BY p.id
        ');
        $scoreStmt->execute([
            ':user_id'    => $userId,
            ':place_id'   => $placeId,
            ':view_bonus' => $viewBonus,
        ]);
        $row   = $scoreStmt->fetch(PDO::FETCH_ASSOC);
        $score = $row ? (float) $row['score'] : 0.0;

        // Upsert into user_place_scores
        $upsert = $this->pdo->prepare('
            INSERT INTO user_place_scores (user_id, place_id, score)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = NOW()
        ');
        $upsert->execute([$userId, $placeId, $score]);
    }

    /**
     * Recalculate and persist scores for ALL places that match user's interests.
     * Called when the user's interests change (Onboarding / setInterests).
     * Uses a single batch INSERT ... ON DUPLICATE KEY UPDATE for performance.
     */
    public function recalcAll(int $userId): void
    {
        // Batch compute scores for all relevant places using subquery for view bonus
        $sql = '
            INSERT INTO user_place_scores (user_id, place_id, score)
            SELECT
                :user_id AS user_id,
                p.id     AS place_id,
                ROUND(
                    COALESCE(SUM(ui.weight), 0) +
                    (CASE WHEN (
                        SELECT COUNT(*) FROM user_signals us2
                        WHERE us2.user_id = :user_id2
                          AND us2.place_id = p.id
                          AND us2.signal_type = \'view\'
                    ) >= :view_threshold THEN :view_bonus ELSE 0 END),
                    2
                ) AS score
            FROM places p
            INNER JOIN tourism_types  tt ON tt.place_id    = p.id
            INNER JOIN user_interests ui ON ui.category_id = tt.category_id
                                        AND ui.user_id     = :user_id3
            GROUP BY p.id
            ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = NOW()
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id'        => $userId,
            ':user_id2'       => $userId,
            ':user_id3'       => $userId,
            ':view_threshold' => self::VIEW_THRESHOLD,
            ':view_bonus'     => self::VIEW_BONUS,
        ]);
    }
}
