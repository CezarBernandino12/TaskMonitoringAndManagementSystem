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
    echo json_encode([
        'error' => $e->getMessage(),
        'file'  => basename($e->getFile()),
        'line'  => $e->getLine(),
    ]);
    exit;
});

// ====================================================================
// BOOTSTRAP
// ====================================================================
require '../../config/db.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string)$profileImage);
    if ($profileImage === '') return null;
    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/');
    return $basePath . '/uploads/profiles/' . rawurlencode($profileImage);
}

// ====================================================================
// AUTH — supervisor must be logged in
// ====================================================================
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit;
}

$supervisorId = (int)$_SESSION['user_id'];

// Fetch the supervisor's department_id and verify their role
$supStmt = $conn->prepare("
    SELECT u.department_id, u.role, d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ? AND u.is_active = 1
    LIMIT 1
");
$supStmt->execute([$supervisorId]);
$supervisor = $supStmt->fetch(PDO::FETCH_ASSOC);

if (!$supervisor) {
    http_response_code(403);
    echo json_encode(['error' => 'Supervisor account not found or inactive.']);
    exit;
}

if (!in_array($supervisor['role'], ['supervisor', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Supervisor role required.']);
    exit;
}

if (empty($supervisor['department_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Supervisor is not assigned to any department.']);
    exit;
}

$supervisorDeptId   = (int)$supervisor['department_id'];
$supervisorDeptName = $supervisor['department_name'];

// ====================================================================
// INPUT VALIDATION
// ====================================================================
$year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');
$month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

if ($year < 2000 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year. Must be between 2000 and 2100.']);
    exit;
}

if ($month < 1 || $month > 12) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid month. Must be between 1 and 12.']);
    exit;
}

// Derive first and last day of the month
$monthStart    = sprintf('%04d-%02d-01', $year, $month);
$daysInMonth   = (int)date('t', strtotime($monthStart));
$monthEnd      = sprintf('%04d-%02d-%02d', $year, $month, $daysInMonth);
$monthEndPlus1 = date('Y-m-d', strtotime($monthEnd . ' +1 day'));

// ====================================================================
// NOTE: All queries below are scoped to $supervisorDeptId.
// The department filter dropdown from the admin version is intentionally
// removed — a supervisor can only view their own department.
// ====================================================================


// ====================================================================
// 1. OVERALL SUMMARY
// ====================================================================
$summarySql = "
    SELECT
        COUNT(DISTINCT t.id) AS total,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at  < ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id
    WHERE u.is_active = 1
    AND u.role = 'staff'
    AND u.department_id = ?
    AND (
        (
            t.status = 'Completed'
            AND t.completed_at IS NOT NULL
            AND t.completed_at >= ?
            AND t.completed_at  < ?
        )
        OR (
            t.deadline IS NOT NULL
            AND DATE(t.deadline) BETWEEN ? AND ?
        )
        OR (
            t.status NOT IN ('Completed')
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) < ?
        )
    )
";

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute([
    $monthStart, $monthEndPlus1,
    $supervisorDeptId,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
]);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


// ====================================================================
// 2. DEPARTMENT BREAKDOWN
// For a supervisor this will always be a single row (their own dept),
// but keeping the same array shape keeps the frontend chart code unchanged.
// ====================================================================
$deptSql = "
    SELECT
        d.id   AS department_id,
        d.name AS department,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at  < ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue,

        COUNT(DISTINCT t.id) AS total

    FROM departments d
    INNER JOIN users u  ON u.department_id = d.id
                       AND u.is_active = 1
                       AND u.role = 'staff'
    LEFT  JOIN tasks t  ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            )
            OR (
                t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN ? AND ?
            )
            OR (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?
            )
        )

    WHERE d.id = ?

    GROUP BY d.id, d.name
    ORDER BY overdue DESC, completed DESC, d.name ASC
";

$deptStmt = $conn->prepare($deptSql);
$deptStmt->execute([
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
    $supervisorDeptId,
]);
$deptRows = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

$departments = array_map(function ($d) {
    $total = (int)$d['total'];
    $comp  = (int)$d['completed'];
    $rate  = $total > 0 ? round(($comp / $total) * 100) : 0;
    return [
        'department_id'   => (int)$d['department_id'],
        'department'      => $d['department'],
        'completed'       => $comp,
        'ongoing'         => (int)$d['ongoing'],
        'overdue'         => (int)$d['overdue'],
        'total'           => $total,
        'completion_rate' => $rate,
    ];
}, $deptRows);


// ====================================================================
// 3. DAILY TREND
// ====================================================================
$calendarUnions = [];
$calendarParams = [];
for ($i = 0; $i < $daysInMonth; $i++) {
    $calendarUnions[] = "SELECT DATE_ADD(?, INTERVAL $i DAY) AS day_date";
    $calendarParams[] = $monthStart;
}
$calendarSql = implode(" UNION ALL ", $calendarUnions);

$dailyTrendSql = "
    SELECT
        cal.day_date AS date,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND DATE(t.completed_at) = cal.day_date
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= cal.day_date
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < cal.day_date
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM ( $calendarSql ) AS cal

    LEFT JOIN tasks t ON (
        t.deadline IS NOT NULL
        AND (
            DATE(t.deadline) BETWEEN ? AND ?
            OR (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND DATE(t.completed_at) BETWEEN ? AND ?
            )
            OR (
                t.status NOT IN ('Completed')
                AND DATE(t.deadline) < ?
            )
        )
    )
    LEFT JOIN users u ON t.assigned_to = u.id
        AND u.is_active = 1
        AND u.role = 'staff'
        AND u.department_id = ?

    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";

$dailyParams = array_merge(
    $calendarParams,
    [$monthStart, $monthEnd, $monthStart, $monthEnd, $monthStart, $supervisorDeptId]
);

$dailyStmt = $conn->prepare($dailyTrendSql);
$dailyStmt->execute($dailyParams);
$dailyRows = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

$dailyTrend = array_map(function ($row) {
    return [
        'date'      => $row['date'],
        'completed' => (int)($row['completed'] ?? 0),
        'ongoing'   => (int)($row['ongoing']   ?? 0),
        'overdue'   => (int)($row['overdue']   ?? 0),
    ];
}, $dailyRows);


// ====================================================================
// 4. EMPLOYEE BREAKDOWN — only staff in the supervisor's department
// ====================================================================
$employeeSql = "
    SELECT
        u.id,
        u.name,
        u.profile_image,
        COALESCE(d.name, 'No Department') AS department,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at  < ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN tasks t ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            )
            OR (
                t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN ? AND ?
            )
            OR (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?
            )
        )

    WHERE u.role = 'staff'
    AND u.is_active = 1
    AND u.department_id = ?

    GROUP BY u.id, u.name, u.profile_image, d.name
    ORDER BY completed DESC, overdue ASC, u.name ASC
";

$empStmt = $conn->prepare($employeeSql);
$empStmt->execute([
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
    $supervisorDeptId,
]);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_values(array_filter(array_map(function ($e) {
    $completed = (int)($e['completed'] ?? 0);
    $ongoing   = (int)($e['ongoing']   ?? 0);
    $overdue   = (int)($e['overdue']   ?? 0);
    $total     = $completed + $ongoing + $overdue;
    if ($total === 0) return null;
    return [
        'id'                => (int)$e['id'],
        'name'              => $e['name'],
        'department'        => $e['department'],
        'profile_image_url' => getProfileImageUrl($e['profile_image'] ?? null),
        'completed'         => $completed,
        'ongoing'           => $ongoing,
        'overdue'           => $overdue,
        'total'             => $total,
        'completion_rate'   => $total > 0 ? round(($completed / $total) * 100) : 0,
    ];
}, $empRows)));


// ====================================================================
// 5. RESPONSE
// ====================================================================
echo json_encode([
    'year'        => $year,
    'month'       => $month,
    'month_start' => $monthStart,
    'month_end'   => $monthEnd,

    // Supervisor context — useful for displaying dept name in the UI
    'supervisor_department_id'   => $supervisorDeptId,
    'supervisor_department_name' => $supervisorDeptName,

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    'departments' => $departments,
    'daily_trend' => $dailyTrend,
    'employees'   => $employees,
]);
