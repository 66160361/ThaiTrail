<?php

// Set session lifetime — ทั้ง cookie และ server-side session data
$sessionLifetime = 86400 * 7; // 7 วัน
ini_set('session.gc_maxlifetime', $sessionLifetime);
ini_set('session.cookie_lifetime', $sessionLifetime);

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_set_cookie_params([
    'lifetime' => $sessionLifetime,
    'path'     => '/',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => $isHttps ? 'None' : 'Lax',
]);
session_start();

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/ScoreService.php';
require_once __DIR__ . '/../controller/PlacesController.php';
require_once __DIR__ . '/../controller/AuthController.php';
require_once __DIR__ . '/../controller/UserInterestController.php';
require_once __DIR__ . '/../controller/RecommendationController.php';
require_once __DIR__ . '/../controller/SignalController.php';

loadAppEnv();

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestUri = rtrim($requestUri, '/');
if ($requestUri === '') {
    $requestUri = '/';
}

// ─── CORS ──────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ─── Route table ───────────────────────────────────────────────────────────
$routes = [
    'POST /api/auth/register' => [AuthController::class, 'register'],
    'POST /api/auth/login' => [AuthController::class, 'login'],
    'POST /api/auth/logout' => [AuthController::class, 'logout'],
    'GET /api/auth/me' => [AuthController::class, 'me'],
    'POST /api/auth/google' => [AuthController::class, 'google'],
    'GET /api/user/interests' => [UserInterestController::class, 'index'],
    'POST /api/user/interests' => [UserInterestController::class, 'store'],
    'GET /api/user/profile' => [AuthController::class, 'profile'],
    'POST /api/user/profile' => [AuthController::class, 'updateProfile'],
    'GET /api/user/interactions' => [AuthController::class, 'interactions'],
    'GET /api/recommendations' => [RecommendationController::class, 'index'],
    'POST /api/signals' => [SignalController::class, 'store'],
    'GET /api/places' => [PlacesController::class, 'index'],
];

$routeKey = "$method $requestUri";
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if (isset($routes[$routeKey])) {
    try {
        [$class, $action] = $routes[$routeKey];
        $controller = new $class($pdo);
        $result = $controller->$action($_GET, $body);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Not Found'], JSON_UNESCAPED_UNICODE);
