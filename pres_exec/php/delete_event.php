<?php
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

session_start();

// ----------------------------------------------------------------
// Auth check (ONLY checks if logged in)
// ----------------------------------------------------------------
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

$sessionUserId = (int)$_SESSION['user_id'];

// ----------------------------------------------------------------
// Parse input
// ----------------------------------------------------------------
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Event ID is required.']);
    exit;
}

$id = (int)$input['id'];

// ----------------------------------------------------------------
// Confirm the event exists
// ----------------------------------------------------------------
$checkStmt = $conn->prepare("SELECT id FROM events WHERE id = ? LIMIT 1");
$checkStmt->execute([$id]);
if (!$checkStmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'Event not found.']);
    exit;
}

// ----------------------------------------------------------------
// Delete (transaction: tags first, then event)
// ----------------------------------------------------------------
$conn->beginTransaction();

try {
    $conn->prepare("DELETE FROM event_employees WHERE event_id = ?")->execute([$id]);
    $conn->prepare("DELETE FROM events WHERE id = ?")->execute([$id]);
    $conn->commit();
} catch (Exception $e) {
    $conn->rollBack();
    throw $e;
}

echo json_encode(['success' => true, 'id' => $id]);