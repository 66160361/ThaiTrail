<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

loadAppEnv();

// Update existing users: set name to 'anonymous' if name equals their email or is empty
$emails = ['66160369@go.buu.ac.th', 'tang1593572@gmail.com'];

foreach ($emails as $email) {
    $stmt = $pdo->prepare("UPDATE users SET name = 'anonymous' WHERE email = ? AND (name = email OR name = '' OR name IS NULL)");
    $stmt->execute([$email]);
    echo $email . ': rows updated = ' . $stmt->rowCount() . PHP_EOL;
}

// Show result
$check = $pdo->query("SELECT id, email, name FROM users WHERE email IN ('66160369@go.buu.ac.th', 'tang1593572@gmail.com')");
foreach ($check->fetchAll(PDO::FETCH_ASSOC) as $u) {
    echo 'ID:' . $u['id'] . ' | ' . $u['email'] . ' | name=' . $u['name'] . PHP_EOL;
}
