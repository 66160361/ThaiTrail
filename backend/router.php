<?php
/**
 * PHP built-in server router script.
 * Usage: php -S localhost:8000 backend/router.php
 *
 * The built-in server calls this script for EVERY request.
 * We serve real static files directly, and route everything
 * else (including /api/*) through public/index.php.
 */

$docRoot    = __DIR__ . '/public';
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$filePath   = $docRoot . $requestUri;

// Serve real static files (CSS, JS, images, etc.) directly
if ($requestUri !== '/' && is_file($filePath)) {
    return false; // let the built-in server handle it
}

// Everything else → public/index.php
$_SERVER['SCRIPT_FILENAME'] = $docRoot . '/index.php';
require $docRoot . '/index.php';
