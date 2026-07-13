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
     * Scoring formula:
     *   score = SUM(user_interests.weight) for each category the place belongs to
     *           that also exists in the user's interests.
     *
     * Multi-category bonus is automatic via SUM — a place in 2 of the user's
     * chosen categories scores 2× a place in only 1 category.
     *
     * Dismissed places are permanently excluded.
     */
    public function index(array $params, array $body): array
    {
        $userId = $this->requireAuth();
        $limit  = min((int) ($params['limit']  ?? 24), 50);
        $offset = max((int) ($params['offset'] ?? 0),  0);

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
                ROUND(SUM(ui.weight), 2) AS score,
                GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.id SEPARATOR ',') AS categories,
                GROUP_CONCAT(DISTINCT c.id            ORDER BY c.id SEPARATOR ',') AS category_ids

            FROM places p

            -- Link to categories via existing many-to-many table
            INNER JOIN tourism_types  tt ON tt.place_id   = p.id
            INNER JOIN categories      c ON c.id          = tt.category_id

            -- Only score categories the user cares about
            INNER JOIN user_interests ui ON ui.category_id = tt.category_id
                                        AND ui.user_id     = :user_id

            -- Exclude dismissed places permanently
            WHERE p.id NOT IN (
                SELECT place_id
                FROM user_dismissed
                WHERE user_id = :user_id
            )

            GROUP BY p.id
            ORDER BY score DESC, p.place_name ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit',   $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset',  $offset, PDO::PARAM_INT);
        $stmt->execute();

        $places = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Normalize types and split concatenated strings to arrays
        foreach ($places as &$place) {
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

        return [
            'success' => true,
            'data'    => $places,
            'limit'   => $limit,
            'offset'  => $offset,
            'count'   => count($places),
        ];
    }
}
