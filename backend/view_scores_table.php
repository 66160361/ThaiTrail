<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

$stmt = $pdo->query('
    SELECT ups.user_id, u.email, ups.place_id, p.place_name, ups.score, ups.updated_at 
    FROM user_place_scores ups
    JOIN users u ON u.id = ups.user_id
    JOIN places p ON p.id = ups.place_id
    ORDER BY ups.score DESC, ups.updated_at DESC
    LIMIT 15
');

echo sprintf("%-8s | %-25s | %-8s | %-30s | %-6s | %-19s", 'User ID', 'Email', 'Place ID', 'Place Name', 'Score', 'Updated At') . PHP_EOL;
echo str_repeat('-', 110) . PHP_EOL;

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $placeName = mb_substr($r['place_name'], 0, 25);
    $email = mb_substr($r['email'], 0, 24);
    echo sprintf("%-8d | %-25s | %-8d | %-30s | %-6.2f | %-19s", $r['user_id'], $email, $r['place_id'], $placeName, $r['score'], $r['updated_at']) . PHP_EOL;
}
