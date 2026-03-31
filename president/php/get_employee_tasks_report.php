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
// INPUT VALIDATION
// ====================================================================
$employeeId = $_GET['employee_id'] ?? null;

if (!$employeeId || !is_numeric($employeeId) || (int)$employeeId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing employee_id. Must be a positive integer.']);
    exit;
}

$employeeId = (int)$employeeId;

// ====================================================================
// VERIFY EMPLOYEE EXISTS AND IS ACTIVE STAFF
// Prevents fetching tasks for non-existent, inactive, or non-staff users.
// ====================================================================
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

// ====================================================================
// FETCH TASKS WITH DERIVED STATUS — TODAY ONLY
// ====================================================================
// Only returns tasks relevant to TODAY, matching the three groups that
// get_daily_report.php counts in the employee table:
//
//   Completed : status = 'Completed'
//               AND completed_at falls on today
//
//   Ongoing   : status NOT IN ('Completed')
//               AND DATE(deadline) >= CURDATE()  (deadline today or future)
//
//   Overdue   : status NOT IN ('Completed')
//               AND DATE(deadline) < CURDATE()   (deadline already passed)
//
// Tasks completed before today are excluded — they are not counted in
// the daily report table and should not appear in the modal either.
//
// derived_status uses the same CASE logic as all other report files
// so the modal tab counts always match the employee table row exactly.
//
// Tasks are ordered: Overdue first → Ongoing → Completed today.
// Within each group, sorted by deadline ascending (soonest first).
// ====================================================================
$tasksSql = "
    SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.progress,
        t.start_date,
        t.deadline,
        t.completed_at,
        t.remarks,
        t.created_at,
        t.updated_at,

        -- Derived status: same logic as get_daily_report.php
        CASE
            WHEN t.status = 'Completed'
                THEN 'Completed'
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
                THEN 'Overdue'
            ELSE 'Ongoing'
        END AS derived_status,

        -- Days until deadline: negative means past due
        CASE
            WHEN t.deadline IS NOT NULL
                THEN DATEDIFF(t.deadline, CURDATE())
            ELSE NULL
        END AS days_until_deadline

    FROM tasks t
    WHERE t.assigned_to = ?
    AND (
        -- Completed today only
        (
            t.status = 'Completed'
            AND t.completed_at IS NOT NULL
            AND t.completed_at >= CURDATE()
            AND t.completed_at  < CURDATE() + INTERVAL 1 DAY
        )
        OR
        -- Ongoing: not completed AND deadline is today or in the future
        (
            t.status NOT IN ('Completed')
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) >= CURDATE()
        )
        OR
        -- Overdue: not completed AND deadline has already passed
        (
            t.status NOT IN ('Completed')
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) < CURDATE()
        )
    )

    ORDER BY
        -- Sort order: Overdue → Ongoing → Completed
        CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
                THEN 0
            WHEN t.status NOT IN ('Completed')
                THEN 1
            ELSE 2
        END ASC,
        -- Within each group, soonest deadline first
        t.deadline ASC,
        t.created_at DESC
";

$tasksStmt = $conn->prepare($tasksSql);
$tasksStmt->execute([$employeeId]);
$taskRows = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

// ====================================================================
// FORMAT RESPONSE
// ====================================================================
$tasks = array_map(function ($t) {
    return [
        'id'                  => (int)$t['id'],
        'title'               => $t['title'],
        'description'         => $t['description'],
        'status'              => $t['status'],              // raw stored value
        'derived_status'      => $t['derived_status'],      // use this in the modal
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

// Summary counts using derived_status — matches what the table shows
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