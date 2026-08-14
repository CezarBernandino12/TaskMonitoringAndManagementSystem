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
// Required: department_id
// Optional: week_start + week_end  → weekly mode (tasks relevant to that week)
//           Omitted               → daily mode  (tasks relevant to today)

$departmentId = $_GET['department_id'] ?? null;
$weekStart    = $_GET['week_start']    ?? null;
$weekEnd      = $_GET['week_end']      ?? null;

if (!$departmentId || !is_numeric($departmentId) || (int)$departmentId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing department_id. Must be a positive integer.']);
    exit;
}

$departmentId = (int)$departmentId;

// Validate dates if provided
$weeklyMode   = false;
$weekEndPlus1 = null;

if ($weekStart || $weekEnd) {
    function isDeptDateValid($date) {
        if (!$date || !is_string($date)) return false;
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
    if (!isDeptDateValid($weekStart) || !isDeptDateValid($weekEnd)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid week_start or week_end. Expected format: YYYY-MM-DD.']);
        exit;
    }
    if ($weekStart > $weekEnd) {
        http_response_code(400);
        echo json_encode(['error' => 'week_start must not be after week_end.']);
        exit;
    }
    $weeklyMode   = true;
    $weekEndPlus1 = date('Y-m-d', strtotime($weekEnd . ' +1 day'));
}

// ====================================================================
// VERIFY DEPARTMENT EXISTS
// ====================================================================
$deptStmt = $conn->prepare("
    SELECT id, name FROM departments WHERE id = ?
");
$deptStmt->execute([$departmentId]);
$department = $deptStmt->fetch(PDO::FETCH_ASSOC);

if (!$department) {
    http_response_code(404);
    echo json_encode(['error' => 'Department not found.']);
    exit;
}

// ====================================================================
// FETCH TASKS FOR THE DEPARTMENT
// ====================================================================
// Each task includes:
//   - task fields (title, description, status, priority, etc.)
//   - derived_status (same logic as all report files)
//   - days_until_deadline
//   - assigned_to_name: the employee the task is assigned to
//
// DAILY MODE  : completed today, ongoing (deadline >= today), overdue (deadline < today)
// WEEKLY MODE : completed within week, deadline within week, or active before week start
// ====================================================================

if ($weeklyMode) {
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
            u.name AS assigned_to_name,

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
        INNER JOIN users u ON t.assigned_to = u.id
            AND u.department_id = ?
            AND u.role = 'staff'
            AND u.is_active = 1

        WHERE (
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
            u.name ASC
    ";
    $tasksStmt = $conn->prepare($tasksSql);
    $tasksStmt->execute([
        $departmentId,
        $weekStart, $weekEndPlus1,
        $weekStart, $weekEnd,
        $weekStart,
    ]);

} else {
    // Daily mode — tasks relevant to today only
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
            u.name AS assigned_to_name,

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
        INNER JOIN users u ON t.assigned_to = u.id
            AND u.department_id = ?
            AND u.role = 'staff'
            AND u.is_active = 1

        WHERE (
            -- Completed today
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= CURDATE()
                AND t.completed_at  < CURDATE() + INTERVAL 1 DAY
            )
            OR
            -- Ongoing: deadline today or future
            (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) >= CURDATE()
            )
            OR
            -- Overdue: deadline already passed
            (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
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
            u.name ASC
    ";
    $tasksStmt = $conn->prepare($tasksSql);
    $tasksStmt->execute([$departmentId]);
}

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
        'days_until_deadline' => $t['days_until_deadline'] !== null ? (int)$t['days_until_deadline'] : null,
        'completed_at'        => $t['completed_at'],
        'remarks'             => $t['remarks'],
        'assigned_to_name'    => $t['assigned_to_name'],
    ];
}, $taskRows);

$counts = [
    'total'     => count($tasks),
    'completed' => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Completed')),
    'ongoing'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Ongoing')),
    'overdue'   => count(array_filter($tasks, fn($t) => $t['derived_status'] === 'Overdue')),
];

echo json_encode([
    'department' => [
        'id'   => (int)$department['id'],
        'name' => $department['name'],
    ],
    'counts' => $counts,
    'tasks'  => $tasks,
]);
