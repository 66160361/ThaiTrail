<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

$stmt = $pdo->query('SELECT COUNT(*) FROM user_place_scores');
echo 'Total rows in user_place_scores: ' . $stmt->fetchColumn() . PHP_EOL;

$users = $pdo->query('SELECT user_id, COUNT(*) as cnt, MAX(score) as max_score FROM user_place_scores GROUP BY user_id');
foreach ($users->fetchAll(PDO::FETCH_ASSOC) as $u) {
    echo 'User ID: ' . $u['user_id'] . ' | Total Places Scored: ' . $u['cnt'] . ' | Max Score: ' . $u['max_score'] . PHP_EOL;
}
