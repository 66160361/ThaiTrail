<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

$sql = file_get_contents(__DIR__ . '/migrations/create_user_place_scores.sql');
$pdo->exec($sql);
echo "Migration OK: user_place_scores table created (or already exists)." . PHP_EOL;

$sql = file_get_contents(__DIR__ . '/migrations/005_add_place_metrics.sql');
$pdo->exec($sql);
echo "Migration OK: place metrics columns added (or already exist)." . PHP_EOL;

$sql = file_get_contents(__DIR__ . '/migrations/006_add_user_signals_duration.sql');
$pdo->exec($sql);
echo "Migration OK: user_signals duration columns added (or already exist)." . PHP_EOL;

$sql = file_get_contents(__DIR__ . '/migrations/007_sync_user_interests_weight.sql');
$pdo->exec($sql);
echo "Migration OK: user_interests weight column synced (or already exists)." . PHP_EOL;

require_once __DIR__ . '/backfill_place_metrics.php';
