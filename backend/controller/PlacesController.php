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
        // ─── GET /api/places?images_for=<place_id> ────────────────────────────
        if (isset($params['images_for']) && $params['images_for'] !== '') {
            $placeId = (int) $params['images_for'];
            $stmt = $this->pdo->prepare(
                'SELECT image_url FROM place_images
                  WHERE place_id = :place_id
                  ORDER BY sort_order ASC'
            );
            $stmt->execute(['place_id' => $placeId]);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        }

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
                $category['places'] = array_map([$this, 'normalizePlaceTimes'], $stmt->fetchAll(PDO::FETCH_ASSOC));
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
            return array_map([$this, 'normalizePlaceTimes'], $stmt->fetchAll(PDO::FETCH_ASSOC));
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

        return array_map([$this, 'normalizePlaceTimes'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function normalizePlaceTimes(array $place): array
    {
        if (array_key_exists('opening_time', $place)) {
            $place['opening_time'] = $this->toTimeArray($place['opening_time']);
        }

        if (array_key_exists('closing_time', $place)) {
            $place['closing_time'] = $this->toTimeArray($place['closing_time']);
        }

        return $place;
    }

    private function toTimeArray($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_array($value)) {
            return array_values(array_filter($value, static fn($item) => $item !== null && $item !== ''));
        }

        if (!is_string($value)) {
            return [$value];
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter($decoded, static fn($item) => $item !== null && $item !== ''));
        }

        if (str_contains($value, ',')) {
            return array_values(array_filter(array_map('trim', explode(',', $value)), static fn($item) => $item !== ''));
        }

        return [trim($value)];
    }
}
