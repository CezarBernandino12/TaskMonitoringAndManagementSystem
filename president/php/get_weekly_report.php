<?php
// ====================================================================
// ERROR HANDLER — returns all PHP errors as clean JSON
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
// INPUT — shared params
// ====================================================================
$weekStart = $_GET['week_start'] ?? null;
$weekEnd   = $_GET['week_end']   ?? null;

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

$weekEndPlus1 = date('Y-m-d', strtotime($weekEnd . ' +1 day'));

// ====================================================================
// ROUTING — detail mode vs list mode
// If employee_id is present → return that employee's tasks (detail mode).
// Otherwise              → return all employees summary + daily trend (list mode).
// ====================================================================
$employeeId = $_GET['employee_id'] ?? null;

if ($employeeId !== null) {
    // ------------------------------------------------------------------
    // DETAIL MODE — single employee's tasks for the week
    // (used by EmployeeTaskModal in the frontend)
    // ------------------------------------------------------------------

    if (!is_numeric($employeeId) || (int)$employeeId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid employee_id. Must be a positive integer.']);
        exit;
    }
    $employeeId = (int)$employeeId;

    // Verify employee exists and is active staff
    $userStmt = $conn->prepare("
        SELECT u.id, u.name, COALESCE(d.name, 'No Department') AS department
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ?
          AND u.role = 'staff'
          AND u.is_active = 1
    ");
    $userStmt->execute([$employeeId]);
    $employee = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$employee) {
        http_response_code(404);
        echo json_encode(['error' => 'Employee not found or is not an active staff member.']);
        exit;
    }

    // Fetch tasks relevant to the selected week
    $tasksSql = "
        SELECT
            t.id, t.title, t.description, t.status, t.priority, t.progress,
            t.start_date, t.deadline, t.completed_at, t.remarks,
            t.created_at, t.updated_at,

            CASE
                WHEN t.status = 'Completed' THEN 'Completed'
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE() THEN 'Overdue'
                ELSE 'Ongoing'
            END AS derived_status,

            CASE
                WHEN t.deadline IS NOT NULL THEN DATEDIFF(t.deadline, CURDATE())
                ELSE NULL
            END AS days_until_deadline

        FROM tasks t
        WHERE t.assigned_to = ?
        AND (
            -- Completed within the week
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            )
            OR
            -- Deadline falls within the week
            (
                t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN ? AND ?
            )
            OR
            -- Already active/overdue before the week started
            (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?
            )
        )
        ORDER BY
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE() THEN 0
                WHEN t.status NOT IN ('Completed') THEN 1
                ELSE 2
            END ASC,
            t.deadline ASC,
            t.created_at DESC
    ";
    $tasksStmt = $conn->prepare($tasksSql);
    $tasksStmt->execute([
        $employeeId,
        $weekStart, $weekEndPlus1,  // completed_at range
        $weekStart, $weekEnd,       // deadline BETWEEN
        $weekStart,                 // already-active before week
    ]);
    $taskRows = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

    $tasks = array_map(function ($t) {
        return [
            'id'                  => (int)$t['id'],
            'title'               => $t['title'],
            'description'         => $t['description'],
            'status'              => $t['status'],
            'derived_status'      => $t['derived_status'],
            'priority'            => $t['priority'],
            'progress'            => (int)($t['progress'] ?? 0),
            'start_date'          => $t['start_date'],
            'deadline'            => $t['deadline'],
            'days_until_deadline' => $t['days_until_deadline'] !== null
                                        ? (int)$t['days_until_deadline']
                                        : null,
            'completed_at'        => $t['completed_at'],
            'remarks'             => $t['remarks'],
            'created_at'          => $t['created_at'],
            'updated_at'          => $t['updated_at'],
        ];
    }, $taskRows);

    $counts = [
        'total'     => count($tasks),
        'completed' => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Completed')),
        'ongoing'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Ongoing')),
        'overdue'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Overdue')),
    ];

    echo json_encode([
        'employee' => [
            'id'         => (int)$employee['id'],
            'name'       => $employee['name'],
            'department' => $employee['department'],
        ],
        'counts' => $counts,
        'tasks'  => $tasks,
    ]);
    exit;
}

// ====================================================================
// LIST MODE — all employees summary + daily trend for the week
// (used by WeeklyReportPage main fetch)
// ====================================================================

// BUG FIX #7: Read and apply the department filter
// 'all' means no filter; any other value is treated as a department id.
$departmentFilter = $_GET['department'] ?? 'all';
$filterByDept     = ($departmentFilter !== 'all' && is_numeric($departmentFilter));
$departmentId     = $filterByDept ? (int)$departmentFilter : null;

// ------------------------------------------------------------------
// Per-employee counts for the week
// ------------------------------------------------------------------
$empSql = "
    SELECT
        u.id,
        u.name,
        COALESCE(d.name, 'No Department') AS department,
        d.id AS department_id,

        -- Completed within the week
        SUM(
            CASE WHEN t.status = 'Completed'
                      AND t.completed_at IS NOT NULL
                      AND t.completed_at >= :ws1
                      AND t.completed_at  < :we1
                 THEN 1 ELSE 0 END
        ) AS completed,

        -- Ongoing: not completed, deadline within or after week
        SUM(
            CASE WHEN t.status NOT IN ('Completed')
                      AND t.deadline IS NOT NULL
                      AND DATE(t.deadline) >= :ws2
                 THEN 1 ELSE 0 END
        ) AS ongoing,

        -- Overdue: not completed, deadline before today, within scope
        SUM(
            CASE WHEN t.status NOT IN ('Completed')
                      AND t.deadline IS NOT NULL
                      AND DATE(t.deadline) < CURDATE()
                      AND DATE(t.deadline) <= :we2
                 THEN 1 ELSE 0 END
        ) AS overdue

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN tasks t
        ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= :ws3
                AND t.completed_at  < :we3
            )
            OR (
                t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN :ws4 AND :we4
            )
            OR (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < :ws5
            )
        )

    WHERE u.role = 'staff'
      AND u.is_active = 1
" . ($filterByDept ? " AND u.department_id = :dept_id " : "") . "

    GROUP BY u.id, u.name, d.name, d.id
    ORDER BY u.name ASC
";

$empStmt = $conn->prepare($empSql);
$empParams = [
    ':ws1' => $weekStart, ':we1' => $weekEndPlus1,
    ':ws2' => $weekStart, ':we2' => $weekEnd,
    ':ws3' => $weekStart, ':we3' => $weekEndPlus1,
    ':ws4' => $weekStart, ':we4' => $weekEnd,
    ':ws5' => $weekStart,
];
if ($filterByDept) {
    $empParams[':dept_id'] = $departmentId;
}
$empStmt->execute($empParams);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

// ------------------------------------------------------------------
// BUG FIX #8: Build daily_trend — one entry per day of the week
// Each entry: { date, day, completed, ongoing, overdue }
// ------------------------------------------------------------------
$dailyTrend = [];
$currentDate = new DateTime($weekStart);
$endDate     = new DateTime($weekEnd);

while ($currentDate <= $endDate) {
    $dayStr      = $currentDate->format('Y-m-d');
    $dayStrPlus1 = (clone $currentDate)->modify('+1 day')->format('Y-m-d');

    $trendSql = "
        SELECT
            SUM(CASE WHEN t.status = 'Completed'
                          AND DATE(t.completed_at) = :day1
                     THEN 1 ELSE 0 END) AS completed,

            SUM(CASE WHEN t.status NOT IN ('Completed')
                          AND t.deadline IS NOT NULL
                          AND DATE(t.deadline) >= :day2
                     THEN 1 ELSE 0 END) AS ongoing,

            SUM(CASE WHEN t.status NOT IN ('Completed')
                          AND t.deadline IS NOT NULL
                          AND DATE(t.deadline) < :day3
                     THEN 1 ELSE 0 END) AS overdue

        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE u.role = 'staff'
          AND u.is_active = 1
    " . ($filterByDept ? " AND u.department_id = :dept_id " : "");

    $trendStmt = $conn->prepare($trendSql);
    $trendParams = [
        ':day1' => $dayStr,
        ':day2' => $dayStr,
        ':day3' => $dayStr,
    ];
    if ($filterByDept) {
        $trendParams[':dept_id'] = $departmentId;
    }
    $trendStmt->execute($trendParams);
    $trendRow = $trendStmt->fetch(PDO::FETCH_ASSOC);

    $dailyTrend[] = [
        'date'      => $dayStr,
        'day'       => $currentDate->format('D'),   // Mon, Tue, …
        'completed' => (int)($trendRow['completed'] ?? 0),
        'ongoing'   => (int)($trendRow['ongoing']   ?? 0),
        'overdue'   => (int)($trendRow['overdue']   ?? 0),
    ];

    $currentDate->modify('+1 day');
}

// ------------------------------------------------------------------
// Per-employee daily_trend (for row-click chart filter in the frontend)
// ------------------------------------------------------------------
$employeeList = [];
foreach ($empRows as $emp) {
    $empDailyTrend = [];
    $currentDate   = new DateTime($weekStart);

    while ($currentDate <= $endDate) {
        $dayStr = $currentDate->format('Y-m-d');

        $etSql = "
            SELECT
                SUM(CASE WHEN t.status = 'Completed'
                              AND DATE(t.completed_at) = :day1
                         THEN 1 ELSE 0 END) AS completed,

                SUM(CASE WHEN t.status NOT IN ('Completed')
                              AND t.deadline IS NOT NULL
                              AND DATE(t.deadline) >= :day2
                         THEN 1 ELSE 0 END) AS ongoing,

                SUM(CASE WHEN t.status NOT IN ('Completed')
                              AND t.deadline IS NOT NULL
                              AND DATE(t.deadline) < :day3
                         THEN 1 ELSE 0 END) AS overdue

            FROM tasks t
            WHERE t.assigned_to = :emp_id
        ";
        $etStmt = $conn->prepare($etSql);
        $etStmt->execute([
            ':day1'   => $dayStr,
            ':day2'   => $dayStr,
            ':day3'   => $dayStr,
            ':emp_id' => (int)$emp['id'],
        ]);
        $etRow = $etStmt->fetch(PDO::FETCH_ASSOC);

        $empDailyTrend[] = [
            'date'      => $dayStr,
            'day'       => $currentDate->format('D'),
            'completed' => (int)($etRow['completed'] ?? 0),
            'ongoing'   => (int)($etRow['ongoing']   ?? 0),
            'overdue'   => (int)($etRow['overdue']   ?? 0),
        ];

        $currentDate->modify('+1 day');
    }

    $employeeList[] = [
        'id'          => (int)$emp['id'],
        'name'        => $emp['name'],
        'department'  => $emp['department'],
        'completed'   => (int)($emp['completed'] ?? 0),
        'ongoing'     => (int)($emp['ongoing']   ?? 0),
        'overdue'     => (int)($emp['overdue']   ?? 0),
        'daily_trend' => $empDailyTrend,
    ];
}

// ------------------------------------------------------------------
// Overall summary totals
// ------------------------------------------------------------------
$summary = [
    'total'     => array_sum(array_column($employeeList, 'completed'))
                 + array_sum(array_column($employeeList, 'ongoing'))
                 + array_sum(array_column($employeeList, 'overdue')),
    'completed' => array_sum(array_column($employeeList, 'completed')),
    'ongoing'   => array_sum(array_column($employeeList, 'ongoing')),
    'overdue'   => array_sum(array_column($employeeList, 'overdue')),
];

echo json_encode([
    'summary'     => $summary,
    'employees'   => $employeeList,
    'daily_trend' => $dailyTrend,
]);
