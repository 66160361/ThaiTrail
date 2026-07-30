<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/ScoreService.php';

loadAppEnv();

$svc = new ScoreService($pdo);

// Recalc for users 12 & 14
$svc->recalcAll(12);
$svc->recalcAll(14);

$stmt = $pdo->query('SELECT COUNT(*) FROM user_place_scores');
echo 'Total rows in user_place_scores: ' . $stmt->fetchColumn() . PHP_EOL;

$stmt2 = $pdo->query('SELECT * FROM user_place_scores ORDER BY score DESC LIMIT 5');
foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo 'User:' . $row['user_id'] . ' Place:' . $row['place_id'] . ' Score:' . $row['score'] . PHP_EOL;
}
