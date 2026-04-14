<?php
// ====================================================================
// ERROR HANDLER
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
    exit;
});
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => $e['message'], 'file' => basename($e['file']), 'line' => $e['line']]);
    }
});

// ====================================================================
// BOOTSTRAP
// ====================================================================
require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }

// ====================================================================
// AUTHENTICATION & DEPARTMENT SCOPING
// ====================================================================
// Department is read from the session — never from the URL.
// A supervisor cannot access another department's data.
// ====================================================================
$supervisorId = $_SESSION['user_id'] ?? null;

if (!$supervisorId) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated. Please log in.']);
    exit;
}

$supStmt = $conn->prepare("
    SELECT u.id, u.name, u.role, u.department_id, d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ? AND u.is_active = 1
");
$supStmt->execute([$supervisorId]);
$supervisor = $supStmt->fetch(PDO::FETCH_ASSOC);

if (!$supervisor) {
    http_response_code(403);
    echo json_encode(['error' => 'User account not found or inactive.']);
    exit;
}
if ($supervisor['role'] !== 'supervisor') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. This endpoint is for supervisors only.']);
    exit;
}
if (!$supervisor['department_id']) {
    http_response_code(403);
    echo json_encode(['error' => 'You are not assigned to any department. Contact an administrator.']);
    exit;
}

$departmentId   = (int)$supervisor['department_id'];
$departmentName = $supervisor['department_name'];

// ====================================================================
// INPUT VALIDATION — year and quarter only (no department param)
// ====================================================================
$year    = isset($_GET['year'])    ? (int)$_GET['year']    : (int)date('Y');
$quarter = isset($_GET['quarter']) ? (int)$_GET['quarter'] : (int)ceil(date('n') / 3);

if ($year < 2000 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year.']);
    exit;
}
if ($quarter < 1 || $quarter > 4) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid quarter. Must be 1–4.']);
    exit;
}

// Derive quarter date boundaries
$qMonthStart  = ($quarter - 1) * 3 + 1;
$qMonthEnd    = $qMonthStart + 2;
$quarterStart = sprintf('%04d-%02d-01', $year, $qMonthStart);
$lastDay      = date('t', mktime(0, 0, 0, $qMonthEnd, 1, $year));
$quarterEnd   = sprintf('%04d-%02d-%02d', $year, $qMonthEnd, $lastDay);
$qEndPlus1    = date('Y-m-d', strtotime($quarterEnd . ' +1 day'));

// Month names for the 3 months in this quarter
$monthNames = [];
for ($i = 0; $i < 3; $i++) {
    $monthNames[] = date('M Y', mktime(0, 0, 0, $qMonthStart + $i, 1, $year));
}

// ====================================================================
// LOGIC RULES (same derived logic as all report files)
// All queries hard-scoped to $departmentId.
//
// COMPLETED : status = 'Completed' AND completed_at within quarter
// ONGOING   : not completed AND DATE(deadline) >= CURDATE()
// OVERDUE   : not completed AND DATE(deadline) < CURDATE()
// RELEVANT  : completed in quarter, deadline in quarter, or active before quarter
// ====================================================================


// --------------------------------------------------------------------
// 1. TOTAL — all tasks assigned to active staff in THIS department
// --------------------------------------------------------------------
$totalStmt = $conn->prepare("
    SELECT COUNT(DISTINCT t.id) AS total
    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id
        AND u.department_id = ?
        AND u.is_active = 1
        AND u.role = 'staff'
");
$totalStmt->execute([$departmentId]);
$totalRow = $totalStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 2. QUARTERLY SUMMARY STATS for this department
// --------------------------------------------------------------------
$statsStmt = $conn->prepare("
    SELECT
        SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ? THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= CURDATE() THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 1 ELSE 0 END) AS overdue
    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id
        AND u.department_id = ?
        AND u.is_active = 1
        AND u.role = 'staff'
    WHERE (
        (t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ?)
        OR (t.deadline IS NOT NULL AND DATE(t.deadline) BETWEEN ? AND ?)
        OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < ?)
    )
");
$statsStmt->execute([
    $quarterStart, $qEndPlus1,
    $departmentId,
    $quarterStart, $qEndPlus1,
    $quarterStart, $quarterEnd,
    $quarterStart,
]);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 3. MONTHLY TREND — one row per month of the quarter (3 rows)
//    Used for the stacked bar chart.
// --------------------------------------------------------------------
$monthlyTrend = [];
for ($i = 0; $i < 3; $i++) {
    $mNum      = $qMonthStart + $i;
    $mStart    = sprintf('%04d-%02d-01', $year, $mNum);
    $mEnd      = date('Y-m-t', strtotime($mStart));
    $mEndPlus1 = date('Y-m-d', strtotime($mEnd . ' +1 day'));

    $mStmt = $conn->prepare("
        SELECT
            SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ? THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= CURDATE() THEN 1 ELSE 0 END) AS ongoing,
            SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id
            AND u.department_id = ?
            AND u.is_active = 1
            AND u.role = 'staff'
        WHERE (
            (t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ?)
            OR (t.deadline IS NOT NULL AND DATE(t.deadline) BETWEEN ? AND ?)
            OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < ?)
        )
    ");
    $mStmt->execute([
        $mStart, $mEndPlus1,
        $departmentId,
        $mStart, $mEndPlus1,
        $mStart, $mEnd,
        $mStart,
    ]);
    $mRow = $mStmt->fetch(PDO::FETCH_ASSOC);

    $comp  = (int)($mRow['completed'] ?? 0);
    $ong   = (int)($mRow['ongoing']   ?? 0);
    $over  = (int)($mRow['overdue']   ?? 0);
    $total = $comp + $ong + $over;

    $monthlyTrend[] = [
        'month_name'      => $monthNames[$i],
        'completed'       => $comp,
        'ongoing'         => $ong,
        'overdue'         => $over,
        'total'           => $total,
        'completion_rate' => $total > 0 ? round(($comp / $total) * 100) : 0,
    ];
}


// --------------------------------------------------------------------
// 4. EMPLOYEE PERFORMANCE — staff in THIS department only
// --------------------------------------------------------------------
$empStmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        ? AS department,
        SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ? THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= CURDATE() THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 1 ELSE 0 END) AS overdue
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to = u.id
        AND (
            (t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ?)
            OR (t.deadline IS NOT NULL AND DATE(t.deadline) BETWEEN ? AND ?)
            OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < ?)
        )
    WHERE u.department_id = ?
    AND u.role = 'staff'
    AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY completed DESC, overdue ASC, u.name ASC
");
$empStmt->execute([
    $departmentName,
    $quarterStart, $qEndPlus1,
    $quarterStart, $qEndPlus1,
    $quarterStart, $quarterEnd,
    $quarterStart,
    $departmentId,
]);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_values(array_filter(array_map(function ($e) {
    $comp  = (int)($e['completed'] ?? 0);
    $ong   = (int)($e['ongoing']   ?? 0);
    $over  = (int)($e['overdue']   ?? 0);
    $total = $comp + $ong + $over;
    if ($total === 0) return null;
    return [
        'id'              => (int)$e['id'],
        'name'            => $e['name'],
        'department'      => $e['department'],
        'completed'       => $comp,
        'ongoing'         => $ong,
        'overdue'         => $over,
        'total'           => $total,
        'completion_rate' => $total > 0 ? round(($comp / $total) * 100) : 0,
    ];
}, $empRows)));


// ====================================================================
// RESPONSE
// ====================================================================
$comp  = (int)($stats['completed'] ?? 0);
$ong   = (int)($stats['ongoing']   ?? 0);
$over  = (int)($stats['overdue']   ?? 0);
$total = $comp + $ong + $over;

echo json_encode([
    'year'          => $year,
    'quarter'       => $quarter,
    'quarter_start' => $quarterStart,
    'quarter_end'   => $quarterEnd,
    'department'    => ['id' => $departmentId, 'name' => $departmentName],
    'supervisor'    => ['id' => (int)$supervisor['id'], 'name' => $supervisor['name']],
    'summary' => [
        'total'           => (int)($totalRow['total'] ?? 0),
        'completed'       => $comp,
        'ongoing'         => $ong,
        'overdue'         => $over,
        'completion_rate' => $total > 0 ? round(($comp / $total) * 100) : 0,
    ],
    'monthly_trend' => $monthlyTrend,
    'employees'     => $employees,
]);
