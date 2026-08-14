<?php
require_once __DIR__ . '/_auth.php';
require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

$department = $_GET['department'] ?? 'all';

$whereDepartment = '';
$params = [];

if ($department !== 'all') {
    $whereDepartment = ' AND u.department_id = :department_id ';
    $params[':department_id'] = $department;
}

// ====================================================================
// LOGIC RULES (applied consistently across all queries)
// ====================================================================
//
// COMPLETED : status = 'Completed'
//             AND completed_at IS NOT NULL
//             AND completed_at falls on today
//
// ONGOING   : status NOT IN ('Completed') — still active
//             AND DATE(deadline) >= CURDATE() — deadline not yet passed
//             Covers stored statuses: 'Ongoing', 'Pending', etc.
//
// OVERDUE   : status NOT IN ('Completed') — still active
//             AND DATE(deadline) < CURDATE() — deadline already passed
//             Covers stored statuses: 'Ongoing', 'Pending', 'Overdue'
//             Derived purely from deadline date so stale stored status
//             values (e.g. 'Ongoing' past its deadline) don't matter.
//
// KEY: ongoing and overdue are mutually exclusive by deadline date —
//      no task can ever be counted in both.
// ====================================================================


// --------------------------------------------------------------------
// TOTAL — all tasks assigned to active staff, no date filter
// --------------------------------------------------------------------
$totalSql = "
    SELECT COUNT(DISTINCT t.id) AS total
    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id
    WHERE u.is_active = 1
    $whereDepartment
";
$totalStmt = $conn->prepare($totalSql);
$totalStmt->execute($params);
$totalRow = $totalStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// SUMMARY STATS — completed today, currently ongoing, currently overdue
// --------------------------------------------------------------------
$statsSql = "
    SELECT
        -- Completed today (range comparison keeps the index on completed_at usable)
        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= CURDATE()
                    AND t.completed_at  < CURDATE() + INTERVAL 1 DAY
                THEN 1 ELSE 0
            END
        ) AS completed,

        -- Ongoing: still active AND deadline is today or in the future
        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        -- Overdue: still active AND deadline has already passed
        -- Works regardless of what the status column says ('Ongoing',
        -- 'Pending', 'Overdue') — derived from the deadline date only
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
    $whereDepartment
";
$statsStmt = $conn->prepare($statsSql);
$statsStmt->execute($params);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// EMPLOYEE PERFORMANCE
// --------------------------------------------------------------------
// overdue uses a 30-day lookback window so it doesn't accumulate
// all-time history. Adjust $reportWindowDays to taste.
// Same derived overdue logic as the summary query above.
// --------------------------------------------------------------------
$reportWindowDays = 30;

$employeeSql = "
    SELECT
        u.id,
        u.name,
        COALESCE(d.name, 'No Department') AS department,

        -- Completed today
        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= CURDATE()
                    AND t.completed_at  < CURDATE() + INTERVAL 1 DAY
                THEN 1 ELSE 0
            END
        ) AS completed,

        -- Ongoing: still active AND deadline today or future
        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        -- Overdue: still active AND deadline passed AND within window
        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                    AND t.deadline >= CURDATE() - INTERVAL :window DAY
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN tasks t ON t.assigned_to = u.id

    WHERE u.role = 'staff'
    AND u.is_active = 1
    $whereDepartment

    GROUP BY u.id, u.name, d.name
    ORDER BY overdue DESC, completed ASC, u.name ASC
";

$employeeParams            = $params;
$employeeParams[':window'] = $reportWindowDays;

$employeeStmt = $conn->prepare($employeeSql);
$employeeStmt->execute($employeeParams);
$employees = $employeeStmt->fetchAll(PDO::FETCH_ASSOC);


// --------------------------------------------------------------------
// RESPONSE
// --------------------------------------------------------------------
echo json_encode([
    'summary' => [
        'total'     => (int)($totalRow['total']  ?? 0),
        'completed' => (int)($stats['completed'] ?? 0),
        'ongoing'   => (int)($stats['ongoing']   ?? 0),
        'overdue'   => (int)($stats['overdue']   ?? 0),
    ],

    'employees' => array_values(
        array_filter(
            array_map(function ($emp) {
                return [
                    'id'         => (int)$emp['id'],
                    'name'       => $emp['name'],
                    'department' => $emp['department'],
                    'completed'  => (int)$emp['completed'],
                    'ongoing'    => (int)$emp['ongoing'],
                    'overdue'    => (int)$emp['overdue'],
                ];
            }, $employees),
            function ($emp) {
                return $emp['completed'] > 0
                    || $emp['ongoing']   > 0
                    || $emp['overdue']   > 0;
            }
        )
    ),
]);