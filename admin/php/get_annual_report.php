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
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// INPUT VALIDATION
// ====================================================================
// Accepts: year (YYYY).
// Defaults to current year if not provided.
// department filter is optional — 'all' shows all departments.

$department = $_GET['department'] ?? 'all';
$year       = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

if ($year < 2000 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year. Must be between 2000 and 2100.']);
    exit;
}

// Derive first and last day of the year
$yearStart    = sprintf('%04d-01-01', $year);
$yearEnd      = sprintf('%04d-12-31', $year);
$yearEndPlus1 = date('Y-m-d', strtotime($yearEnd . ' +1 day'));

// The four quarters in the year
$quarters = [];
for ($q = 1; $q <= 4; $q++) {
    $qMonthStart = ($q - 1) * 3 + 1;
    $qMonthEnd   = $qMonthStart + 2;
    $qStart      = sprintf('%04d-%02d-01', $year, $qMonthStart);
    $qDays       = (int)date('t', strtotime(sprintf('%04d-%02d-01', $year, $qMonthEnd)));
    $qEnd        = sprintf('%04d-%02d-%02d', $year, $qMonthEnd, $qDays);
    $quarters[]  = [
        'quarter'         => $q,
        'quarter_start'   => $qStart,
        'quarter_end'     => $qEnd,
        'quarter_end_plus1' => date('Y-m-d', strtotime($qEnd . ' +1 day')),
    ];
}

// ====================================================================
// LOGIC RULES
// ====================================================================
//
// COMPLETED : status = 'Completed'
//             AND completed_at falls within [yearStart, yearEnd]
//
// ONGOING   : status NOT IN ('Completed')
//             AND DATE(deadline) >= CURDATE()
//
// OVERDUE   : status NOT IN ('Completed')
//             AND DATE(deadline) < CURDATE()
//
// RELEVANT  : task is in scope for this year if:
//             (a) completed_at falls within the year, OR
//             (b) deadline falls within the year, OR
//             (c) it was already active/overdue before the year started
// ====================================================================

$filterByDept = ($department !== 'all');
$deptClause   = $filterByDept ? 'AND u.department_id = ?' : '';


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
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
];
if ($filterByDept) $summaryParams[] = $department;

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute($summaryParams);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


// ====================================================================
// 2. DEPARTMENT BREAKDOWN
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
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
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
// 3. QUARTERLY TREND — one row per quarter (4 rows)
// Replaces the monthly/daily trend. Shows momentum across the year.
// ====================================================================
$QUARTER_NAMES = [1 => 'Q1', 2 => 'Q2', 3 => 'Q3', 4 => 'Q4'];
$QUARTER_RANGES = [
    1 => 'Jan – Mar',
    2 => 'Apr – Jun',
    3 => 'Jul – Sep',
    4 => 'Oct – Dec',
];

$quarterlyTrend = [];
foreach ($quarters as $qInfo) {
    $qStart    = $qInfo['quarter_start'];
    $qEnd      = $qInfo['quarter_end'];
    $qEndPlus1 = $qInfo['quarter_end_plus1'];
    $qNum      = $qInfo['quarter'];

    $qDeptClause = $filterByDept ? 'AND u.department_id = ?' : '';

    $qSql = "
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
        $qDeptClause
    ";

    $qParams = [
        $qStart, $qEndPlus1,
        $qStart, $qEndPlus1,
        $qStart, $qEnd,
        $qStart,
    ];
    if ($filterByDept) $qParams[] = $department;

    $qStmt = $conn->prepare($qSql);
    $qStmt->execute($qParams);
    $qRow = $qStmt->fetch(PDO::FETCH_ASSOC);

    $comp  = (int)($qRow['completed'] ?? 0);
    $ong   = (int)($qRow['ongoing']   ?? 0);
    $ovr   = (int)($qRow['overdue']   ?? 0);
    $total = $comp + $ong + $ovr;

    $quarterlyTrend[] = [
        'quarter'         => $qNum,
        'quarter_label'   => $QUARTER_NAMES[$qNum],
        'quarter_range'   => $QUARTER_RANGES[$qNum],
        'quarter_start'   => $qStart,
        'quarter_end'     => $qEnd,
        'completed'       => $comp,
        'ongoing'         => $ong,
        'overdue'         => $ovr,
        'total'           => $total,
        'completion_rate' => $total > 0 ? round(($comp / $total) * 100) : 0,
    ];
}


// ====================================================================
// 4. MONTHLY TREND — one row per calendar month (12 rows)
// Powers the line chart showing the full year's completion trajectory.
// ====================================================================
$MONTH_NAMES = [
    1=>'Jan', 2=>'Feb', 3=>'Mar', 4=>'Apr', 5=>'May',  6=>'Jun',
    7=>'Jul', 8=>'Aug', 9=>'Sep',10=>'Oct',11=>'Nov',12=>'Dec',
];

$monthlyTrend = [];
for ($m = 1; $m <= 12; $m++) {
    $mStart    = sprintf('%04d-%02d-01', $year, $m);
    $mDays     = (int)date('t', strtotime($mStart));
    $mEnd      = sprintf('%04d-%02d-%02d', $year, $m, $mDays);
    $mEndPlus1 = date('Y-m-d', strtotime($mEnd . ' +1 day'));

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
        'month'       => $m,
        'month_name'  => $MONTH_NAMES[$m],
        'completed'   => (int)($mRow['completed'] ?? 0),
        'ongoing'     => (int)($mRow['ongoing']   ?? 0),
        'overdue'     => (int)($mRow['overdue']   ?? 0),
    ];
}


// ====================================================================
// 5. EMPLOYEE BREAKDOWN
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
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
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
// 6. RESPONSE
// ====================================================================
echo json_encode([
    'year'       => $year,
    'year_start' => $yearStart,
    'year_end'   => $yearEnd,

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    // Per-department: { department_id, department, completed, ongoing, overdue, total, completion_rate }
    'departments'      => $departments,

    // Per-quarter: { quarter, quarter_label, quarter_range, quarter_start, quarter_end, completed, ongoing, overdue, total, completion_rate }
    'quarterly_trend'  => $quarterlyTrend,

    // Per-month: { month, month_name, completed, ongoing, overdue }
    'monthly_trend'    => $monthlyTrend,

    // Per-employee: { id, name, department, completed, ongoing, overdue, total, completion_rate }
    'employees'        => $employees,
]);
