<?php
require_once __DIR__ . '/_auth.php';
// ====================================================================
// toggle_user_status.php
// Activates or deactivates a user account.
//
// Expects JSON body: { id: int, is_active: 0|1 }
// Returns: { success: true, id: int, is_active: int }
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

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required.']);
    exit;
}

$id       = (int)$input['id'];
$isActive = isset($input['is_active']) ? (int)(bool)$input['is_active'] : null;

if ($isActive === null) {
    http_response_code(400);
    echo json_encode(['error' => 'is_active value is required.']);
    exit;
}

// Prevent self-deactivation
if ($id === (int)$_SESSION['user_id'] && $isActive === 0) {
    http_response_code(403);
    echo json_encode(['error' => 'You cannot deactivate your own account.']);
    exit;
}

$checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
$checkStmt->execute([$id]);
if (!$checkStmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found.']);
    exit;
}

$conn->prepare("UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?")
     ->execute([$isActive, $id]);

echo json_encode(['success' => true, 'id' => $id, 'is_active' => $isActive]);
