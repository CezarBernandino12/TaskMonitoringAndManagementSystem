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
// The supervisor's own department_id is pulled from the session.
// All queries are hard-scoped to that department — the supervisor
// cannot access data for any other department, even by manipulating
// the URL. No department filter param is accepted from the frontend.
// ====================================================================
$supervisorId = $_SESSION['user_id'] ?? null;

if (!$supervisorId) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated. Please log in.']);
    exit;
}

// Fetch the supervisor's own record to get their department_id and verify role
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
// INPUT VALIDATION — week dates only (no department param accepted)
// ====================================================================
$weekStart = $_GET['week_start'] ?? null;
$weekEnd   = $_GET['week_end']   ?? null;

function isSupervisorDateValid($date) {
    if (!$date || !is_string($date)) return false;
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

if (!isSupervisorDateValid($weekStart) || !isSupervisorDateValid($weekEnd)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing week_start / week_end. Expected format: YYYY-MM-DD.']);
    exit;
}

if ($weekStart > $weekEnd) {
    http_response_code(400);
    echo json_encode(['error' => 'week_start must not be after week_end.']);
    exit;
}

$weekEndPlus1 = date('Y-m-d', strtotime($weekEnd . ' +1 day'));

// ====================================================================
// LOGIC RULES (same derived logic as all report files)
// ====================================================================
// All queries are filtered to $departmentId — only staff belonging to
// the supervisor's own department are included.
//
// COMPLETED : status = 'Completed' AND completed_at within the week
// ONGOING   : not completed AND DATE(deadline) >= CURDATE()
// OVERDUE   : not completed AND DATE(deadline) < CURDATE()
// RELEVANT  : completed within week, deadline in week, or active before week
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
// 2. SUMMARY STATS for this week, this department
// --------------------------------------------------------------------
$statsSql = "
    SELECT
        SUM(CASE
            WHEN t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            THEN 1 ELSE 0
        END) AS completed,

        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) >= CURDATE()
            THEN 1 ELSE 0
        END) AS ongoing,

        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue

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
";
$statsStmt = $conn->prepare($statsSql);
$statsStmt->execute([
    $weekStart, $weekEndPlus1,
    $departmentId,
    $weekStart, $weekEndPlus1,
    $weekStart, $weekEnd,
    $weekStart,
]);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 3. DAILY TREND — 7 rows Mon–Sun for this department
// --------------------------------------------------------------------
$calUnions  = [];
$calParams  = [];
for ($i = 0; $i < 7; $i++) {
    $calUnions[] = "SELECT DATE_ADD(?, INTERVAL $i DAY) AS day_date";
    $calParams[] = $weekStart;
}
$calendarSql = implode(' UNION ALL ', $calUnions);

$dailySql = "
    SELECT
        cal.day_date AS date,
        SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND DATE(t.completed_at) = cal.day_date THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= cal.day_date THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < cal.day_date THEN 1 ELSE 0 END) AS overdue
    FROM ($calendarSql) AS cal
    LEFT JOIN tasks t ON (
        t.deadline IS NOT NULL
        AND (
            DATE(t.deadline) BETWEEN ? AND ?
            OR (t.status = 'Completed' AND t.completed_at IS NOT NULL AND DATE(t.completed_at) BETWEEN ? AND ?)
            OR (t.status NOT IN ('Completed') AND DATE(t.deadline) < ?)
        )
    )
    LEFT JOIN users u ON t.assigned_to = u.id
        AND u.department_id = ?
        AND u.is_active = 1
        AND u.role = 'staff'
    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";

$dailyParams = array_merge(
    $calParams,
    [$weekStart, $weekEnd, $weekStart, $weekEnd, $weekStart, $departmentId]
);
$dailyStmt = $conn->prepare($dailySql);
$dailyStmt->execute($dailyParams);
$dailyTrend = array_map(function ($row) {
    return [
        'date'      => $row['date'],
        'completed' => (int)($row['completed'] ?? 0),
        'ongoing'   => (int)($row['ongoing']   ?? 0),
        'overdue'   => (int)($row['overdue']   ?? 0),
    ];
}, $dailyStmt->fetchAll(PDO::FETCH_ASSOC));


// --------------------------------------------------------------------
// 4. EMPLOYEE PERFORMANCE — staff in THIS department only
// --------------------------------------------------------------------
$empSql = "
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
    ORDER BY overdue DESC, completed DESC, u.name ASC
";
$empStmt = $conn->prepare($empSql);
$empStmt->execute([
    $departmentName,
    $weekStart, $weekEndPlus1,
    $weekStart, $weekEndPlus1,
    $weekStart, $weekEnd,
    $weekStart,
    $departmentId,
]);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 5. PER-EMPLOYEE DAILY TREND — for line chart filtering by staff row
// --------------------------------------------------------------------
$empDailySql = "
    SELECT
        cal.day_date AS date,
        SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND DATE(t.completed_at) = cal.day_date THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= cal.day_date THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < cal.day_date THEN 1 ELSE 0 END) AS overdue
    FROM ($calendarSql) AS cal
    LEFT JOIN tasks t ON t.assigned_to = ?
        AND t.deadline IS NOT NULL
        AND (
            DATE(t.deadline) BETWEEN ? AND ?
            OR (t.status = 'Completed' AND t.completed_at IS NOT NULL AND DATE(t.completed_at) BETWEEN ? AND ?)
            OR (t.status NOT IN ('Completed') AND DATE(t.deadline) < ?)
        )
    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";
$empDailyStmt = $conn->prepare($empDailySql);

$employees = [];
foreach ($empRows as $emp) {
    $empDailyStmt->execute(array_merge(
        $calParams,
        [$emp['id'], $weekStart, $weekEnd, $weekStart, $weekEnd, $weekStart]
    ));
    $empTrend = array_map(function ($row) {
        return [
            'date'      => $row['date'],
            'completed' => (int)($row['completed'] ?? 0),
            'ongoing'   => (int)($row['ongoing']   ?? 0),
            'overdue'   => (int)($row['overdue']   ?? 0),
        ];
    }, $empDailyStmt->fetchAll(PDO::FETCH_ASSOC));

    $completed = (int)($emp['completed'] ?? 0);
    $ongoing   = (int)($emp['ongoing']   ?? 0);
    $overdue   = (int)($emp['overdue']   ?? 0);

    if ($completed > 0 || $ongoing > 0 || $overdue > 0) {
        $employees[] = [
            'id'          => (int)$emp['id'],
            'name'        => $emp['name'],
            'department'  => $departmentName,
            'completed'   => $completed,
            'ongoing'     => $ongoing,
            'overdue'     => $overdue,
            'daily_trend' => $empTrend,
        ];
    }
}


// ====================================================================
// RESPONSE
// ====================================================================
echo json_encode([
    'week_start'  => $weekStart,
    'week_end'    => $weekEnd,
    'department'  => [
        'id'   => $departmentId,
        'name' => $departmentName,
    ],
    'supervisor'  => [
        'id'   => (int)$supervisor['id'],
        'name' => $supervisor['name'],
    ],
    'summary' => [
        'total'     => (int)($totalRow['total']  ?? 0),
        'completed' => (int)($stats['completed'] ?? 0),
        'ongoing'   => (int)($stats['ongoing']   ?? 0),
        'overdue'   => (int)($stats['overdue']   ?? 0),
    ],
    'daily_trend' => $dailyTrend,
    'employees'   => array_values($employees),
]);
