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
// Auth check (ONLY login required)
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

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input.']);
    exit;
}

$id          = isset($input['id']) && $input['id'] ? (int)$input['id'] : null;
$title       = trim($input['title']       ?? '');
$description = trim($input['description'] ?? '');
$location    = trim($input['location']    ?? '');
$startDate   = trim($input['start_date']  ?? '');
$endDate     = trim($input['end_date']    ?? '');
$status      = trim($input['status']      ?? 'Upcoming');
$priority    = trim($input['priority']    ?? 'Medium');
$taggedEmps  = isset($input['tagged_employees']) && is_array($input['tagged_employees'])
    ? array_map('intval', $input['tagged_employees'])
    : [];

// ----------------------------------------------------------------
// Validation
// ----------------------------------------------------------------
$allowedStatuses  = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
$allowedPriorities = ['High', 'Medium', 'Low'];

if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Title is required.']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid start_date format. Use YYYY-MM-DD.']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid end_date format. Use YYYY-MM-DD.']);
    exit;
}
if ($endDate < $startDate) {
    http_response_code(400);
    echo json_encode(['error' => 'end_date must be on or after start_date.']);
    exit;
}
if (!in_array($status, $allowedStatuses, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid status value.']);
    exit;
}
if (!in_array($priority, $allowedPriorities, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid priority value.']);
    exit;
}

// Validate tagged employee IDs exist
if (!empty($taggedEmps)) {
    $placeholders = implode(',', array_fill(0, count($taggedEmps), '?'));
    $empCheckStmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE id IN ($placeholders) AND is_active = 1");
    $empCheckStmt->execute($taggedEmps);
    if ((int)$empCheckStmt->fetchColumn() !== count($taggedEmps)) {
        http_response_code(400);
        echo json_encode(['error' => 'One or more tagged employee IDs are invalid.']);
        exit;
    }
}

// ----------------------------------------------------------------
// Persist
// ----------------------------------------------------------------
$conn->beginTransaction();

try {
    $now = date('Y-m-d H:i:s');

    if ($id) {
        $checkStmt = $conn->prepare("SELECT id FROM events WHERE id = ? LIMIT 1");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'Event not found.']);
            exit;
        }

        $conn->prepare("
            UPDATE events
            SET title       = ?,
                description = ?,
                location    = ?,
                start_date  = ?,
                end_date    = ?,
                status      = ?,
                priority    = ?,
                updated_at  = ?
            WHERE id = ?
        ")->execute([$title, $description, $location, $startDate, $endDate, $status, $priority, $now, $id]);

    } else {
        $insertStmt = $conn->prepare("
            INSERT INTO events (title, description, location, start_date, end_date, status, priority, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([$title, $description, $location, $startDate, $endDate, $status, $priority, $sessionUserId, $now, $now]);
        $id = (int)$conn->lastInsertId();
    }

    $conn->prepare("DELETE FROM event_employees WHERE event_id = ?")->execute([$id]);

    if (!empty($taggedEmps)) {
        $tagInsert = $conn->prepare("INSERT INTO event_employees (event_id, user_id) VALUES (?, ?)");
        foreach ($taggedEmps as $empId) {
            $tagInsert->execute([$id, $empId]);
        }
    }

    $conn->commit();

} catch (Exception $e) {
    $conn->rollBack();
    throw $e;
}

// ----------------------------------------------------------------
// Return
// ----------------------------------------------------------------
$fetchStmt = $conn->prepare("
    SELECT id, title, description, location, start_date, end_date, status, priority, created_by, created_at, updated_at
    FROM events WHERE id = ? LIMIT 1
");
$fetchStmt->execute([$id]);
$savedEvent = $fetchStmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'event' => [
        'id'               => (int)$savedEvent['id'],
        'title'            => $savedEvent['title'],
        'description'      => $savedEvent['description'] ?? '',
        'location'         => $savedEvent['location']    ?? '',
        'start_date'       => $savedEvent['start_date'],
        'end_date'         => $savedEvent['end_date'],
        'status'           => $savedEvent['status'],
        'priority'         => $savedEvent['priority'],
        'created_by'       => (int)$savedEvent['created_by'],
        'created_at'       => $savedEvent['created_at'],
        'updated_at'       => $savedEvent['updated_at'],
        'tagged_employees' => $taggedEmps,
    ],
]);