<?php
// ====================================================================
// ERROR HANDLER — catches ALL PHP errors and returns them as clean JSON
// instead of HTML so the frontend never gets a parse error.
// Remove or disable in production once confirmed stable.
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
$department = $_GET['department'] ?? 'all';
$weekStart  = $_GET['week_start'] ?? null;
$weekEnd    = $_GET['week_end']   ?? null;

// Renamed from isValidDate() to avoid any potential conflicts.
// Type hints removed for broadest PHP 5.6+ compatibility.
function isWeekDateValid($date) {
    if (!$date || !is_string($date)) return false;
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

if (!isWeekDateValid($weekStart) || !isWeekDateValid($weekEnd)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing week_start / week_end. Expected format: YYYY-MM-DD.']);
    exit;
}

if ($weekStart > $weekEnd) {
    http_response_code(400);
    echo json_encode(['error' => 'week_start must not be after week_end.']);
    exit;
}

// ====================================================================
// HELPERS
// ====================================================================
// Returns true if department filter is active.
$filterByDept = ($department !== 'all');

// week_end_plus1: used in range comparisons so completed_at < this value
// covers the entire last day of the week (i.e. < Monday of next week).
$weekEndPlus1 = date('Y-m-d', strtotime($weekEnd . ' +1 day'));

// ====================================================================
// LOGIC RULES (consistent across all queries, using ? placeholders)
// ====================================================================
//
// PDO does not allow the same named placeholder to appear more than
// once in a single query. To avoid this completely, ALL queries below
// use positional ? placeholders. Each ? maps to its value by position
// in the execute() array — no aliasing needed.
//
// COMPLETED : status = 'Completed'
//             AND completed_at IS NOT NULL
//             AND completed_at >= week_start AND < week_end + 1 day
//
// ONGOING   : status NOT IN ('Completed')
//             AND DATE(deadline) >= CURDATE()  (not yet past as of today)
//
// OVERDUE   : status NOT IN ('Completed')
//             AND DATE(deadline) < CURDATE()   (deadline has passed)
//
// RELEVANT  : a task is in scope for this week if:
//             (a) completed_at falls within the week, OR
//             (b) deadline falls within the week, OR
//             (c) it was already active/overdue before the week started
// ====================================================================


// --------------------------------------------------------------------
// 1. TOTAL — all tasks assigned to active staff, no date filter
// --------------------------------------------------------------------
if ($filterByDept) {
    $totalSql = "
        SELECT COUNT(DISTINCT t.id) AS total
        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id
        WHERE u.is_active = 1
        AND u.department_id = ?
    ";
    $totalStmt = $conn->prepare($totalSql);
    $totalStmt->execute([$department]);
} else {
    $totalSql = "
        SELECT COUNT(DISTINCT t.id) AS total
        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id
        WHERE u.is_active = 1
    ";
    $totalStmt = $conn->prepare($totalSql);
    $totalStmt->execute();
}
$totalRow = $totalStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 2. WEEKLY SUMMARY STATS
// Counts completed/ongoing/overdue across all relevant tasks this week.
// Each ? value listed in execute() matches its ? in the SQL by position.
// --------------------------------------------------------------------
$deptClause = $filterByDept ? 'AND u.department_id = ?' : '';

$statsSql = "
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
    $deptClause
";

// Build params positionally — one value per ? in order
$statsParams = [
    // completed_at range for CASE
    $weekStart, $weekEndPlus1,
    // completed_at range for WHERE relevance check
    $weekStart, $weekEndPlus1,
    // deadline BETWEEN for WHERE relevance check
    $weekStart, $weekEnd,
    // deadline < week_start for already-overdue tasks
    $weekStart,
];
if ($filterByDept) $statsParams[] = $department;

$statsStmt = $conn->prepare($statsSql);
$statsStmt->execute($statsParams);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 3. DAILY TREND — 7 rows (Mon–Sun), one per day
//    Uses a UNION ALL subquery to generate the calendar inline.
//    Each day gets completed/ongoing/overdue counts for that specific day.
// --------------------------------------------------------------------
$dailyDeptJoin  = $filterByDept ? 'AND u.department_id = ?' : '';

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

    FROM (
        SELECT DATE_ADD(?, INTERVAL 0 DAY) AS day_date
        UNION ALL SELECT DATE_ADD(?, INTERVAL 1 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 2 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 3 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 4 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 5 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 6 DAY)
    ) AS cal

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
        $dailyDeptJoin

    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";

// 7 × week_start for DATE_ADD, then the relevance range params
$dailyParams = [
    $weekStart, $weekStart, $weekStart, $weekStart,
    $weekStart, $weekStart, $weekStart,
    // deadline BETWEEN
    $weekStart, $weekEnd,
    // completed_at BETWEEN
    $weekStart, $weekEnd,
    // already-overdue before week
    $weekStart,
];
if ($filterByDept) $dailyParams[] = $department;

$dailyStmt = $conn->prepare($dailyTrendSql);
$dailyStmt->execute($dailyParams);
$dailyTrendRows = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

$dailyTrend = array_map(function ($row) {
    return [
        'date'      => $row['date'],
        'completed' => (int)($row['completed'] ?? 0),
        'ongoing'   => (int)($row['ongoing']   ?? 0),
        'overdue'   => (int)($row['overdue']   ?? 0),
    ];
}, $dailyTrendRows);


// --------------------------------------------------------------------
// 4. EMPLOYEE PERFORMANCE — weekly totals per staff member
// --------------------------------------------------------------------
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
    ORDER BY overdue DESC, completed DESC, u.name ASC
";

$employeeParams = [
    // completed CASE
    $weekStart, $weekEndPlus1,
    // LEFT JOIN relevance
    $weekStart, $weekEndPlus1,
    $weekStart, $weekEnd,
    $weekStart,
];
if ($filterByDept) $employeeParams[] = $department;

$employeeStmt = $conn->prepare($employeeSql);
$employeeStmt->execute($employeeParams);
$employeeRows = $employeeStmt->fetchAll(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// 5. PER-EMPLOYEE DAILY TREND
//    Prepared once, executed per employee inside the loop.
// --------------------------------------------------------------------
$empDailyTrendSql = "
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

    FROM (
        SELECT DATE_ADD(?, INTERVAL 0 DAY) AS day_date
        UNION ALL SELECT DATE_ADD(?, INTERVAL 1 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 2 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 3 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 4 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 5 DAY)
        UNION ALL SELECT DATE_ADD(?, INTERVAL 6 DAY)
    ) AS cal

    LEFT JOIN tasks t ON t.assigned_to = ?
        AND t.deadline IS NOT NULL
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

    GROUP BY cal.day_date
    ORDER BY cal.day_date ASC
";

$empDailyStmt = $conn->prepare($empDailyTrendSql);

// Build final employees array with daily_trend attached
$employees = [];
foreach ($employeeRows as $emp) {
    $empDailyStmt->execute([
        // 7 × week_start for DATE_ADD calendar
        $weekStart, $weekStart, $weekStart, $weekStart,
        $weekStart, $weekStart, $weekStart,
        // employee id for task join
        $emp['id'],
        // deadline BETWEEN
        $weekStart, $weekEnd,
        // completed_at BETWEEN
        $weekStart, $weekEnd,
        // already-overdue before week
        $weekStart,
    ]);

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

    // Only include employees with at least one relevant task this week
    if ($completed > 0 || $ongoing > 0 || $overdue > 0) {
        $employees[] = [
            'id'          => (int)$emp['id'],
            'name'        => $emp['name'],
            'department'  => $emp['department'],
            'completed'   => $completed,
            'ongoing'     => $ongoing,
            'overdue'     => $overdue,
            'daily_trend' => $empTrend,
        ];
    }
}


// --------------------------------------------------------------------
// 6. RESPONSE
// --------------------------------------------------------------------
echo json_encode([
    'week_start'  => $weekStart,
    'week_end'    => $weekEnd,

    'summary' => [
        'total'     => (int)($totalRow['total']  ?? 0),
        'completed' => (int)($stats['completed'] ?? 0),
        'ongoing'   => (int)($stats['ongoing']   ?? 0),
        'overdue'   => (int)($stats['overdue']   ?? 0),
    ],

    'daily_trend' => $dailyTrend,
    'employees'   => array_values($employees),
]);