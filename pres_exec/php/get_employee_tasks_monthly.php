<?php
require_once __DIR__ . '/_auth.php';
// ====================================================================
// ERROR HANDLER — return clean JSON errors
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
$start      = $_GET['week_start'] ?? null;
$end        = $_GET['week_end'] ?? null;

if (!$employeeId || !is_numeric($employeeId) || (int)$employeeId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid employee_id']);
    exit;
}

if (!$start || !$end) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing date range']);
    exit;
}

$employeeId = (int)$employeeId;

// ====================================================================
// VERIFY EMPLOYEE
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
    echo json_encode(['error' => 'Employee not found']);
    exit;
}

// ====================================================================
// FETCH TASKS (MONTHLY LOGIC)
// ====================================================================
//
// LOGIC:
// - Completed → ONLY those completed within selected range
// - Ongoing / Overdue → still included (active tasks)
//
// This matches your React filtering perfectly
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

        -- Derived status (aligned with React)
        CASE
            WHEN t.completed_at IS NOT NULL THEN 'Completed'
            WHEN t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 'Overdue'
            ELSE 'Ongoing'
        END AS derived_status,

        -- Days until deadline
        CASE
            WHEN t.deadline IS NOT NULL
                THEN DATEDIFF(t.deadline, CURDATE())
            ELSE NULL
        END AS days_until_deadline

    FROM tasks t
    WHERE t.assigned_to = ?
    AND (
        -- Completed within selected month
        (
            t.completed_at IS NOT NULL
            AND DATE(t.completed_at) BETWEEN ? AND ?
        )

        OR

        -- Active tasks (not completed)
        (
            t.completed_at IS NULL
        )
    )

    ORDER BY
        CASE
            WHEN t.completed_at IS NULL AND t.deadline < CURDATE() THEN 0
            WHEN t.completed_at IS NULL THEN 1
            ELSE 2
        END,
        t.deadline ASC,
        t.created_at DESC
";

$tasksStmt = $conn->prepare($tasksSql);
$tasksStmt->execute([$employeeId, $start, $end]);
$taskRows = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

// ====================================================================
// FORMAT RESPONSE
// ====================================================================
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

// ====================================================================
// COUNTS (matches modal tabs exactly)
// ====================================================================
$counts = [
    'total'     => count($tasks),
    'completed' => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Completed')),
    'ongoing'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Ongoing')),
    'overdue'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Overdue')),
];

// ====================================================================
// RESPONSE
// ====================================================================
echo json_encode([
    'employee' => [
        'id'         => (int)$employee['id'],
        'name'       => $employee['name'],
        'department' => $employee['department'],
    ],
    'counts' => $counts,
    'tasks'  => $tasks,
]);