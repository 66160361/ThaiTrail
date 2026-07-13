<?php

class PlacesController
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function index(array $params = [], array $body = []): array
    {
        $categoryId = $params['category_id'] ?? $params['group_by_category'] ?? null;
        $groupByCategory = ($params['mode'] ?? null) === 'group';

        if ($groupByCategory) {
            $categories = $this->pdo->query('SELECT id, category_name FROM categories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
            foreach ($categories as &$category) {
                $stmt = $this->pdo->prepare(
                    'SELECT p.* FROM places p
                     INNER JOIN tourism_types tt ON p.id = tt.place_id
                     WHERE tt.category_id = :category_id'
                );
                $stmt->execute(['category_id' => $category['id']]);
                $category['places'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            unset($category);
            return $categories;
        }

        if ($categoryId !== null && $categoryId !== '') {
            $sql = "SELECT p.*, 
                           GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                           GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
                    FROM places p
                    INNER JOIN tourism_types tt ON p.id = tt.place_id
                    LEFT JOIN categories c ON tt.category_id = c.id
                    WHERE tt.category_id = :category_id
                    GROUP BY p.id
                    ORDER BY p.place_name";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['category_id' => $categoryId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $stmt = $this->pdo->query(
            "SELECT p.*, 
                    GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                    GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
             FROM places p
             LEFT JOIN tourism_types tt ON p.id = tt.place_id
             LEFT JOIN categories c ON tt.category_id = c.id
             GROUP BY p.id
             ORDER BY p.place_name"
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
