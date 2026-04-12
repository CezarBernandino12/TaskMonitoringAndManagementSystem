<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

require_once '../../config/db.php';
require_once '../../config/presence.php';

try {
    markUserActive($conn, (int) $_SESSION['user_id']);

    echo json_encode([
        'success' => true,
        'server_time' => date('c')
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update presence.']);
}