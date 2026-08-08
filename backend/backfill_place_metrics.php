<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

function normalizeText(?string $value): string
{
    $value = strip_tags((string) $value);
    $value = preg_replace('/\s+/u', ' ', $value);
    return trim($value);
}

function countWords(?string $value): int
{
    $text = normalizeText($value);
    if ($text === '') {
        return 0;
    }

    return count(preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY));
}

function countPhotos(?string $value): int
{
    $value = trim((string) $value);
    if ($value === '') {
        return 0;
    }

    $parts = preg_split('/\s*(?:,|;|\||\n)\s*/u', $value, -1, PREG_SPLIT_NO_EMPTY);
    return count($parts);
}

function countPhotosFromImagesJson(?string $value): int
{
    $value = trim((string) $value);
    if ($value === '') {
        return 0;
    }

    $decoded = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        $photos = array_filter($decoded, static fn($item) => !empty((string) $item));
        return count($photos);
    }

    return countPhotos($value);
}

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name'
    );
    $stmt->execute([
        ':table_name' => $table,
        ':column_name' => $column,
    ]);
    return ((int) $stmt->fetchColumn()) > 0;
}

function computeExpectedReadTime(int $wordCount): int
{
    if ($wordCount <= 0) {
        return 0;
    }

    return (int) max(1, (int) ceil($wordCount / 200));
}

try {
    $hasImageUrl = columnExists($pdo, 'places', 'image_url');
    $hasImagesJson = columnExists($pdo, 'places', 'images_json');

    $selectFields = ['id', 'description'];
    if ($hasImageUrl) {
        $selectFields[] = 'image_url';
    }
    if ($hasImagesJson) {
        $selectFields[] = 'images_json';
    }

    $sql = 'SELECT ' . implode(', ', $selectFields) . ' FROM places ORDER BY id';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;

    $updateStmt = $pdo->prepare(
        'UPDATE places SET word_count = :word_count, photo_count = :photo_count, expected_read_time = :expected_read_time WHERE id = :id'
    );

    foreach ($rows as $row) {
        $wordCount = countWords($row['description'] ?? null);
        if ($hasImagesJson) {
            $photoCount = countPhotosFromImagesJson($row['images_json'] ?? null);
        } else {
            $photoCount = countPhotos($row['image_url'] ?? null);
        }
        $expectedReadTime = computeExpectedReadTime($wordCount);

        $updateStmt->execute([
            ':word_count' => $wordCount,
            ':photo_count' => $photoCount,
            ':expected_read_time' => $expectedReadTime,
            ':id' => (int) $row['id'],
        ]);

        $updated++;
    }

    echo 'Backfill OK: updated ' . $updated . ' places.' . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, 'Backfill failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
