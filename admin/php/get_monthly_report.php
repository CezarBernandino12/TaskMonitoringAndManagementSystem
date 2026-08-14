<?php
require_once __DIR__ . '/_auth.php';
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
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// INPUT VALIDATION
// ====================================================================
// Accepts: year (YYYY) and month (1–12).
// Defaults to current year/month if not provided.
// department filter is optional — 'all' shows all departments.

$department = $_GET['department'] ?? 'all';
$year       = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');
$month      = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

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
$monthStart   = sprintf('%04d-%02d-01', $year, $month);
$daysInMonth  = (int)date('t', strtotime($monthStart));
$monthEnd     = sprintf('%04d-%02d-%02d', $year, $month, $daysInMonth);
$monthEndPlus1 = date('Y-m-d', strtotime($monthEnd . ' +1 day'));

// ====================================================================
// LOGIC RULES (same derived logic used across all report files)
// ====================================================================
//
// COMPLETED : status = 'Completed'
//             AND completed_at falls within [monthStart, monthEnd]
//
// ONGOING   : status NOT IN ('Completed')
//             AND DATE(deadline) >= CURDATE()
//
// OVERDUE   : status NOT IN ('Completed')
//             AND DATE(deadline) < CURDATE()
//
// RELEVANT  : task is in scope for this month if:
//             (a) completed_at falls within the month, OR
//             (b) deadline falls within the month, OR
//             (c) it was already active/overdue before the month started
// ====================================================================

$filterByDept = ($department !== 'all');
$deptClause   = $filterByDept ? 'AND u.department_id = ?' : '';


// ====================================================================
// 1. OVERALL SUMMARY — total tasks, completed/ongoing/overdue this month
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
    $deptClause
";

$summaryParams = [
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
];
if ($filterByDept) $summaryParams[] = $department;

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute($summaryParams);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


// ====================================================================
// 2. DEPARTMENT BREAKDOWN
// Shows completed/ongoing/overdue per department for the month.
// This drives the grouped bar chart — the primary visual.
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
    INNER JOIN users u  ON u.department_id = d.id AND u.is_active = 1 AND u.role = 'staff'
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

    GROUP BY d.id, d.name
    ORDER BY overdue DESC, completed DESC, d.name ASC
";

$deptParams = [
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
];

$deptStmt = $conn->prepare($deptSql);
$deptStmt->execute($deptParams);
$deptRows = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

$departments = array_map(function ($d) {
    $total = (int)$d['total'];
    $comp  = (int)$d['completed'];
    $rate  = $total > 0 ? round(($comp / $total) * 100) : 0;
    return [
        'department_id' => (int)$d['department_id'],
        'department'    => $d['department'],
        'completed'     => $comp,
        'ongoing'       => (int)$d['ongoing'],
        'overdue'       => (int)$d['overdue'],
        'total'         => $total,
        'completion_rate' => $rate,
    ];
}, $deptRows);


// ====================================================================
// 3. DAILY TREND — one row per calendar day of the month
// Used for the line chart showing momentum across the month.
// Generated using a recursive CTE (MySQL 8+) or UNION ALL fallback.
// ====================================================================

// Build UNION ALL calendar for every day of the month
$calendarUnions = [];
$calendarParams = [];
for ($i = 0; $i < $daysInMonth; $i++) {
    $calendarUnions[] = "SELECT DATE_ADD(?, INTERVAL $i DAY) AS day_date";
    $calendarParams[] = $monthStart;
}
$calendarSql = implode(" UNION ALL ", $calendarUnions);

$deptDailyJoin  = $filterByDept ? 'AND u.department_id = ?' : '';

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
        $deptDailyJoin

    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";

$dailyParams = array_merge(
    $calendarParams,
    [$monthStart, $monthEnd, $monthStart, $monthEnd, $monthStart]
);
if ($filterByDept) $dailyParams[] = $department;

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
// 4. EMPLOYEE BREAKDOWN
// Top performers within the selected department (or all departments).
// Used for the horizontal bar chart.
// ====================================================================
$empDeptClause = $filterByDept ? 'AND u.department_id = ?' : '';

$employeeSql = "
    SELECT
        u.id,
        u.name,
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
    $empDeptClause

    GROUP BY u.id, u.name, d.name
    ORDER BY completed DESC, overdue ASC, u.name ASC
";

$empParams = [
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEndPlus1,
    $monthStart, $monthEnd,
    $monthStart,
];
if ($filterByDept) $empParams[] = $department;

$empStmt = $conn->prepare($employeeSql);
$empStmt->execute($empParams);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_values(array_filter(array_map(function ($e) {
    $completed = (int)($e['completed'] ?? 0);
    $ongoing   = (int)($e['ongoing']   ?? 0);
    $overdue   = (int)($e['overdue']   ?? 0);
    $total     = $completed + $ongoing + $overdue;
    if ($total === 0) return null;
    return [
        'id'              => (int)$e['id'],
        'name'            => $e['name'],
        'department'      => $e['department'],
        'completed'       => $completed,
        'ongoing'         => $ongoing,
        'overdue'         => $overdue,
        'total'           => $total,
        'completion_rate' => $total > 0 ? round(($completed / $total) * 100) : 0,
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

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    // Per-department: { department_id, department, completed, ongoing, overdue, total, completion_rate }
    'departments' => $departments,

    // Per-day of month: { date, completed, ongoing, overdue }
    'daily_trend' => $dailyTrend,

    // Per-employee: { id, name, department, completed, ongoing, overdue, total, completion_rate }
    'employees'   => $employees,
]);