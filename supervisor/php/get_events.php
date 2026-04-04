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

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

$year  = isset($_GET['year'])  ? (int)$_GET['year']  : null;
$month = isset($_GET['month']) ? (int)$_GET['month'] : null;

// ------------------------------------------------------------
// Optional date filter
// ------------------------------------------------------------
$dateWhere  = '';
$dateParams = [];

if ($year && $month) {
    $rangeStart = sprintf('%04d-%02d-01', $year, $month);
    $lastDay    = date('t', mktime(0, 0, 0, $month, 1, $year));
    $rangeEnd   = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);

    $dateWhere  = 'AND e.start_date <= ? AND e.end_date >= ?';
    $dateParams = [$rangeEnd, $rangeStart];
} elseif ($year) {
    $dateWhere  = 'AND YEAR(e.start_date) = ?';
    $dateParams = [$year];
}

// ------------------------------------------------------------
// ALL users now see ALL events
// ------------------------------------------------------------
$sql = "
    SELECT
        e.id,
        e.title,
        e.description,
        e.location,
        e.start_date,
        e.end_date,
        e.status,
        e.priority,
        e.created_by,
        e.created_at,
        e.updated_at
    FROM events e
    WHERE 1=1
    $dateWhere
    ORDER BY e.start_date ASC, e.title ASC
";

$stmt = $conn->prepare($sql);
$stmt->execute($dateParams);
$eventRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($eventRows)) {
    echo json_encode([]);
    exit;
}

// ------------------------------------------------------------
// Fetch tagged employees for each event
// ------------------------------------------------------------
$eventIds     = array_column($eventRows, 'id');
$placeholders = implode(',', array_fill(0, count($eventIds), '?'));

$tagStmt = $conn->prepare("
    SELECT event_id, user_id
    FROM event_employees
    WHERE event_id IN ($placeholders)
    ORDER BY event_id, user_id
");
$tagStmt->execute($eventIds);
$tagRows = $tagStmt->fetchAll(PDO::FETCH_ASSOC);

$tagMap = [];
foreach ($tagRows as $row) {
    $tagMap[(int)$row['event_id']][] = (int)$row['user_id'];
}

// ------------------------------------------------------------
// Final response
// ------------------------------------------------------------
$events = array_map(function ($row) use ($tagMap) {
    $id = (int)$row['id'];

    return [
        'id'               => $id,
        'title'            => $row['title'],
        'description'      => $row['description'] ?? '',
        'location'         => $row['location'] ?? '',
        'start_date'       => $row['start_date'],
        'end_date'         => $row['end_date'],
        'status'           => $row['status'],
        'priority'         => $row['priority'],
        'created_by'       => (int)$row['created_by'],
        'created_at'       => $row['created_at'],
        'updated_at'       => $row['updated_at'],
        'tagged_employees' => $tagMap[$id] ?? []
    ];
}, $eventRows);

echo json_encode($events);
