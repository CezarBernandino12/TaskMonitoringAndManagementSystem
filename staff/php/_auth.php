<?php
/**
 * _auth.php — auto-prepended to every PHP file in staff/php/
 * Enforces: user must be authenticated AND have the 'staff' role.
 */

ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_name('STAFF_SESSION');
    session_start();
}

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['error' => 'Not authenticated.', 'redirect' => '../auth/login.html']);
    exit();
}

if (($_SESSION['role'] ?? '') !== 'staff') {
    http_response_code(403);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['error' => 'Access denied. This area is for Staff only.', 'redirect' => '../auth/login.html']);
    exit();
}
