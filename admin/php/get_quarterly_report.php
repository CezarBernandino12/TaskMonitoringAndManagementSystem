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
// Accepts: year (YYYY) and quarter (1–4).
// Defaults to current year/quarter if not provided.
// department filter is optional — 'all' shows all departments.

$department = $_GET['department'] ?? 'all';
$year       = isset($_GET['year'])    ? (int)$_GET['year']    : (int)date('Y');
$quarter    = isset($_GET['quarter']) ? (int)$_GET['quarter'] : (int)ceil(date('n') / 3);

if ($year < 2000 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year. Must be between 2000 and 2100.']);
    exit;
}

if ($quarter < 1 || $quarter > 4) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid quarter. Must be between 1 and 4.']);
    exit;
}

// Derive first and last day of the quarter
// Q1: Jan–Mar | Q2: Apr–Jun | Q3: Jul–Sep | Q4: Oct–Dec
$quarterMonthStart = ($quarter - 1) * 3 + 1;         // e.g. Q2 → 4
$quarterMonthEnd   = $quarterMonthStart + 2;          // e.g. Q2 → 6

$quarterStart   = sprintf('%04d-%02d-01', $year, $quarterMonthStart);
$lastMonthDays  = (int)date('t', strtotime(sprintf('%04d-%02d-01', $year, $quarterMonthEnd)));
$quarterEnd     = sprintf('%04d-%02d-%02d', $year, $quarterMonthEnd, $lastMonthDays);
$quarterEndPlus1 = date('Y-m-d', strtotime($quarterEnd . ' +1 day'));

// The three months in this quarter for the monthly trend breakdown
$months = [];
for ($m = $quarterMonthStart; $m <= $quarterMonthEnd; $m++) {
    $mStart = sprintf('%04d-%02d-01', $year, $m);
    $mDays  = (int)date('t', strtotime($mStart));
    $mEnd   = sprintf('%04d-%02d-%02d', $year, $m, $mDays);
    $months[] = [
        'month'       => $m,
        'month_start' => $mStart,
        'month_end'   => $mEnd,
        'month_end_plus1' => date('Y-m-d', strtotime($mEnd . ' +1 day')),
    ];
}

// ====================================================================
// LOGIC RULES (same derived logic as monthly report)
// ====================================================================
//
// COMPLETED : status = 'Completed'
//             AND completed_at falls within [quarterStart, quarterEnd]
//
// ONGOING   : status NOT IN ('Completed')
//             AND DATE(deadline) >= CURDATE()
//
// OVERDUE   : status NOT IN ('Completed')
//             AND DATE(deadline) < CURDATE()
//
// RELEVANT  : task is in scope for this quarter if:
//             (a) completed_at falls within the quarter, OR
//             (b) deadline falls within the quarter, OR
//             (c) it was already active/overdue before the quarter started
// ====================================================================

$filterByDept = ($department !== 'all');
$deptClause   = $filterByDept ? 'AND u.department_id = ?' : '';


// ====================================================================
// 1. OVERALL SUMMARY — total tasks, completed/ongoing/overdue this quarter
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
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEnd,
    $quarterStart,
];
if ($filterByDept) $summaryParams[] = $department;

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute($summaryParams);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


// ====================================================================
// 2. DEPARTMENT BREAKDOWN
// Shows completed/ongoing/overdue per department for the quarter.
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
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEnd,
    $quarterStart,
];

$deptStmt = $conn->prepare($deptSql);
$deptStmt->execute($deptParams);
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
// 3. MONTHLY TREND — one row per month within the quarter (3 rows)
// Used for the grouped bar chart showing momentum across the quarter.
// This replaces the daily line chart from the monthly report.
// ====================================================================
$MONTH_NAMES = [
    1=>'January',2=>'February',3=>'March',4=>'April',
    5=>'May',6=>'June',7=>'July',8=>'August',
    9=>'September',10=>'October',11=>'November',12=>'December'
];

$monthlyTrend = [];
foreach ($months as $mInfo) {
    $mStart     = $mInfo['month_start'];
    $mEnd       = $mInfo['month_end'];
    $mEndPlus1  = $mInfo['month_end_plus1'];
    $mNum       = $mInfo['month'];

    $mDeptClause = $filterByDept ? 'AND u.department_id = ?' : '';

    $mSql = "
        SELECT
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
        $mDeptClause
    ";

    $mParams = [
        $mStart, $mEndPlus1,
        $mStart, $mEndPlus1,
        $mStart, $mEnd,
        $mStart,
    ];
    if ($filterByDept) $mParams[] = $department;

    $mStmt = $conn->prepare($mSql);
    $mStmt->execute($mParams);
    $mRow = $mStmt->fetch(PDO::FETCH_ASSOC);

    $monthlyTrend[] = [
        'month'       => $mNum,
        'month_name'  => $MONTH_NAMES[$mNum],
        'month_start' => $mStart,
        'month_end'   => $mEnd,
        'completed'   => (int)($mRow['completed'] ?? 0),
        'ongoing'     => (int)($mRow['ongoing']   ?? 0),
        'overdue'     => (int)($mRow['overdue']   ?? 0),
    ];
}


// ====================================================================
// 4. EMPLOYEE BREAKDOWN
// Top performers within the selected department (or all departments).
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
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEndPlus1,
    $quarterStart, $quarterEnd,
    $quarterStart,
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
    'year'            => $year,
    'quarter'         => $quarter,
    'quarter_start'   => $quarterStart,
    'quarter_end'     => $quarterEnd,

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    // Per-department: { department_id, department, completed, ongoing, overdue, total, completion_rate }
    'departments'   => $departments,

    // Per-month in quarter: { month, month_name, month_start, month_end, completed, ongoing, overdue }
    'monthly_trend' => $monthlyTrend,

    // Per-employee: { id, name, department, completed, ongoing, overdue, total, completion_rate }
    'employees'     => $employees,
]);
