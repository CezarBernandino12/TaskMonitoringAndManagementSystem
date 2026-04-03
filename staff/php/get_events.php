<?php
// ====================================================================
// get_events.php
// Returns events for the calendar.
//
// Behaviour:
//   - Marketing users  → fetch ALL events (no user_id param needed)
//   - Non-Marketing    → call with ?user_id=X to get only events the
//                        user is tagged in OR events with no tagged
//                        employees (i.e. company-wide events)
//
// Optional filters (GET params):
//   user_id    — restrict to events tagged for this user + public events
//   year       — filter by year  (e.g. 2025)
//   month      — filter by month (1–12); used together with year
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

session_start();

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$year   = isset($_GET['year'])    ? (int)$_GET['year']    : null;
$month  = isset($_GET['month'])   ? (int)$_GET['month']   : null;

// ----------------------------------------------------------------
// Date range filter (optional)
// ----------------------------------------------------------------
$dateWhere  = '';
$dateParams = [];

if ($year && $month) {
    $rangeStart = sprintf('%04d-%02d-01', $year, $month);
    $lastDay    = date('t', mktime(0, 0, 0, $month, 1, $year));
    $rangeEnd   = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
    // Event overlaps the month if it starts before month end AND ends after month start
    $dateWhere  = 'AND e.start_date <= ? AND e.end_date >= ?';
    $dateParams = [$rangeEnd, $rangeStart];
} elseif ($year) {
    $dateWhere  = 'AND YEAR(e.start_date) = ?';
    $dateParams = [$year];
}

// ----------------------------------------------------------------
// User filter: tagged in event OR event has no tagged employees
// ----------------------------------------------------------------
if ($userId) {
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
        WHERE (
            -- Tagged directly
            EXISTS (
                SELECT 1 FROM event_employees ee
                WHERE ee.event_id = e.id AND ee.user_id = ?
            )
            OR
            -- No one is tagged (company-wide / public event)
            NOT EXISTS (
                SELECT 1 FROM event_employees ee2
                WHERE ee2.event_id = e.id
            )
        )
        $dateWhere
        ORDER BY e.start_date ASC, e.title ASC
    ";
    $params = array_merge([$userId], $dateParams);
} else {
    // Marketing — all events
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
    $params = $dateParams;
}

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$eventRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($eventRows)) {
    echo json_encode([]);
    exit;
}

// ----------------------------------------------------------------
// Fetch tagged employees for all returned events in one query
// ----------------------------------------------------------------
$eventIds    = array_column($eventRows, 'id');
$placeholders = implode(',', array_fill(0, count($eventIds), '?'));

$tagStmt = $conn->prepare("
    SELECT event_id, user_id
    FROM event_employees
    WHERE event_id IN ($placeholders)
    ORDER BY event_id, user_id
");
$tagStmt->execute($eventIds);
$tagRows = $tagStmt->fetchAll(PDO::FETCH_ASSOC);

// Group tagged user IDs by event_id
$tagMap = [];
foreach ($tagRows as $row) {
    $tagMap[(int)$row['event_id']][] = (int)$row['user_id'];
}

// ----------------------------------------------------------------
// Build final response
// ----------------------------------------------------------------
$events = array_map(function ($row) use ($tagMap) {
    $id = (int)$row['id'];
    return [
        'id'                => $id,
        'title'             => $row['title'],
        'description'       => $row['description'] ?? '',
        'location'          => $row['location']    ?? '',
        'start_date'        => $row['start_date'],
        'end_date'          => $row['end_date'],
        'status'            => $row['status'],
        'priority'          => $row['priority'],
        'created_by'        => (int)$row['created_by'],
        'created_at'        => $row['created_at'],
        'updated_at'        => $row['updated_at'],
        'tagged_employees'  => $tagMap[$id] ?? [],
    ];
}, $eventRows);

echo json_encode($events);
