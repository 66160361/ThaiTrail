<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

$sql = file_get_contents(__DIR__ . '/migrations/create_user_place_scores.sql');
$pdo->exec($sql);
echo "Migration OK: user_place_scores table created (or already exists)." . PHP_EOL;
