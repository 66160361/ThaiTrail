<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

// $pdo is now available from database.php

$emails = ['66160369@go.buu.ac.th', 'tang1593572@gmail.com'];

$stmt = $pdo->prepare(
    'SELECT id, name, email, onboarded FROM users WHERE email IN (?, ?)'
);
$stmt->execute($emails);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($users)) {
    echo "No users found for those emails." . PHP_EOL;
    exit;
}

foreach ($users as $u) {
    echo "ID: " . $u['id'] . " | Email: " . $u['email'] . " | Name: " . $u['name'] . " | Onboarded: " . $u['onboarded'] . PHP_EOL;

    $iStmt = $pdo->prepare('SELECT category_id, weight FROM user_interests WHERE user_id = ?');
    $iStmt->execute([$u['id']]);
    $interests = $iStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "  Interests count: " . count($interests) . PHP_EOL;
    foreach ($interests as $i) {
        echo "  -> cat_id=" . $i['category_id'] . "  weight=" . $i['weight'] . PHP_EOL;
    }
    echo PHP_EOL;

    // Auto-fix: if has interests but onboarded = 0, update it
    if ((int)$u['onboarded'] === 0 && count($interests) > 0) {
        $fix = $pdo->prepare('UPDATE users SET onboarded = 1 WHERE id = ?');
        $fix->execute([$u['id']]);
        echo "  *** FIXED: Set onboarded = 1 for user " . $u['email'] . PHP_EOL . PHP_EOL;
    }
}
