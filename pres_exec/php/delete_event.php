<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
require_once '../../config/notifications.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }

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
// Confirm the event exists and pre-fetch data for notifications
// ----------------------------------------------------------------
$checkStmt = $conn->prepare("SELECT title, start_date, end_date, location FROM events WHERE id = ? LIMIT 1");
$checkStmt->execute([$id]);
$evtRow = $checkStmt->fetch(PDO::FETCH_ASSOC);
if (!$evtRow) {
    http_response_code(404);
    echo json_encode(['error' => 'Event not found.']);
    exit;
}

// Fetch tagged employees before deletion for notifications
$taggedStmt = $conn->prepare("SELECT user_id FROM event_employees WHERE event_id = ?");
$taggedStmt->execute([$id]);
$taggedUserIds = array_map('intval', $taggedStmt->fetchAll(PDO::FETCH_COLUMN, 0));

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

// ----------------------------------------------------------------
// Dispatch cancellation notifications to tagged employees
// ----------------------------------------------------------------
if (!empty($taggedUserIds)) {
    $evtTitle  = $evtRow['title'];
    $evtStart  = $evtRow['start_date'];
    $evtEnd    = $evtRow['end_date'];
    $evtLoc    = $evtRow['location'] ?? '';
    $dateRange = ($evtStart === $evtEnd)
        ? date('M j, Y', strtotime($evtStart))
        : date('M j', strtotime($evtStart)) . ' \u2013 ' . date('M j, Y', strtotime($evtEnd));
    $body = $evtLoc ? "{$evtLoc} \u2022 {$dateRange}" : $dateRange;

    foreach ($taggedUserIds as $empId) {
        if ($empId === $sessionUserId) continue;
        dispatchNotification($conn, $empId, $sessionUserId, 'event_cancelled',
            'Event Cancelled: ' . $evtTitle, $body, null, null);
    }
}

echo json_encode(['success' => true, 'id' => $id]);