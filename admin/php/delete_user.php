<?php
require_once __DIR__ . '/_auth.php';
// ====================================================================
// delete_user.php
// Permanently deletes a user record.
// Consider using toggle_user_status.php (deactivate) instead of
// hard-deleting, to preserve historical task/event data.
//
// Expects JSON body: { id: int }
// Returns: { success: true, id: int }
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
require_once '../../config/log_activity.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ----------------------------------------------------------------
// Only admin can delete users (uncomment to enforce)
// ----------------------------------------------------------------
// $callerStmt = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
// $callerStmt->execute([$_SESSION['user_id']]);
// $caller = $callerStmt->fetch(PDO::FETCH_ASSOC);
// if (!$caller || $caller['role'] !== 'admin') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Only administrators can delete users.']);
//     exit;
// }

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required.']);
    exit;
}

$id = (int)$input['id'];

// Prevent self-deletion
if ($id === (int)$_SESSION['user_id']) {
    http_response_code(403);
    echo json_encode(['error' => 'You cannot delete your own account.']);
    exit;
}

$checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
$checkStmt->execute([$id]);
if (!$checkStmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found.']);
    exit;
}

// ----------------------------------------------------------------
// Hard delete
// Note: If you have FK constraints (tasks.assigned_to, events
// created_by, etc.), either SET NULL / CASCADE must be defined
// in the schema, or handle those here before deleting the user.
// ----------------------------------------------------------------
// Capture name before deleting
$nameStmt = $conn->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
$nameStmt->execute([$id]);
$deletedRow = $nameStmt->fetch(PDO::FETCH_ASSOC);
$deletedName = $deletedRow['name'] ?? "ID {$id}";

$conn->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);

logActivity($conn, 'user.deleted', 'user', $id, "Deleted user: {$deletedName}");

echo json_encode(['success' => true, 'id' => $id]);
