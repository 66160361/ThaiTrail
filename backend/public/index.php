<?php

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../controller/PlacesController.php';
require_once __DIR__ . '/../controller/AuthController.php';

loadAppEnv();

function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$baseDir = dirname(__DIR__);
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod === 'OPTIONS') {
    sendJson(204, []);
}

if ($requestUri === '/api/places' && $requestMethod === 'GET') {
    try {
        require_once __DIR__ . '/../config/database.php';

        $controller = new PlacesController($pdo);
        $data = $controller->index($_GET);

        sendJson(200, $data);
    } catch (Throwable $e) {
        sendJson(500, [
            'success' => false,
            'message' => 'Database is unavailable',
        ]);
    }
}

if ($requestUri === '/api/auth/google') {
    if ($requestMethod !== 'POST') {
        sendJson(405, [
            'success' => false,
            'message' => 'Method Not Allowed',
        ]);
    }

    $rawBody = file_get_contents('php://input') ?: '';
    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        sendJson(400, [
            'success' => false,
            'message' => 'Invalid JSON request body',
        ]);
    }

    try {
        require_once __DIR__ . '/../config/database.php';

        $controller = new AuthController($pdo, (string) (getenv('GOOGLE_CLIENT_ID') ?: ''));
        $result = $controller->loginWithGoogle($payload);
        sendJson(200, $result);
    } catch (InvalidArgumentException $e) {
        sendJson(400, [
            'success' => false,
            'message' => $e->getMessage(),
        ]);
    } catch (PDOException $e) {
        sendJson(500, [
            'success' => false,
            'message' => 'Database is unavailable',
        ]);
    } catch (RuntimeException $e) {
        sendJson(401, [
            'success' => false,
            'message' => $e->getMessage(),
        ]);
    } catch (Throwable $e) {
        sendJson(500, [
            'success' => false,
            'message' => 'Unexpected server error',
        ]);
    }
}

sendJson(404, [
    'success' => false,
    'message' => 'Not Found',
]);
