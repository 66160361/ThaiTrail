<?php

require_once __DIR__ . '/env.php';
loadAppEnv();

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '8889';
$db = getenv('DB_NAME') ?: 'thai_trail_db';
$user = getenv('DB_USER') ?: 'root';

$pass = getenv('DB_PASSWORD');
if ($pass === false) {
    $pass = getenv('DB_PASS');
}
if ($pass === false) {
    $pass = 'root';
}

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user,
        $pass
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    throw $e;
}