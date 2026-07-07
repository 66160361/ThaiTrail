<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controller/PlacesController.php';

$baseDir = dirname(__DIR__);
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($requestUri === '/api/places') {
    $controller = new PlacesController($pdo);
    $data = $controller->index($_GET);

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(404);
echo json_encode([
    'success' => false,
    'message' => 'Not Found',
], JSON_UNESCAPED_UNICODE);
