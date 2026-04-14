<?php
// ====================================================================
// get_current_user.php
// Returns the currently logged-in user's profile.
// Expects session to be started and $_SESSION['user_id'] to be set
// by your existing login system.
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

$userId = (int)$_SESSION['user_id'];

$stmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.department_id,
        COALESCE(d.name, '') AS department
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
    AND u.is_active = 1
    LIMIT 1
");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found.']);
    exit;
}

echo json_encode([
    'id'            => (int)$user['id'],
    'name'          => $user['name'],
    'email'         => $user['email'],
    'role'          => $user['role'],
    'department_id' => (int)$user['department_id'],
    'department'    => $user['department'],
]);
