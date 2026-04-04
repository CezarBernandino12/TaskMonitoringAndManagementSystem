<?php
// ====================================================================
// get_supervisor_daily_report.php
//
// Returns the same daily report data as get_daily_report.php but
// ALWAYS scoped to the logged-in supervisor's own department.
//
// The frontend also calls get_daily_report.php?department=X directly
// (reusing the existing endpoint), so this file is the dedicated
// server-side entry point that:
//   1. Verifies the session and confirms the user is a supervisor.
//   2. Resolves their department_id from the session.
//   3. Delegates to the same core query logic.
//
// Response shape (matches get_daily_report.php exactly):
// {
//   date:       "YYYY-MM-DD",
//   department: { id, name },
//   supervisor: { id, name },
//   summary:    { total, completed, ongoing, overdue },
//   employees:  [ { id, name, department, completed, ongoing, overdue } ]
// }
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

require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

session_start();

// ----------------------------------------------------------------
// 1. Authentication check
// ----------------------------------------------------------------
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated. Please log in.']);
    exit;
}

$sessionUserId = (int)$_SESSION['user_id'];

// ----------------------------------------------------------------
// 2. Load the supervisor's profile and verify their role
// ----------------------------------------------------------------
$supervisorStmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.role,
        u.department_id,
        COALESCE(d.name, u.department) AS department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
    AND u.is_active = 1
    LIMIT 1
");
$supervisorStmt->execute([$sessionUserId]);
$supervisor = $supervisorStmt->fetch(PDO::FETCH_ASSOC);

if (!$supervisor) {
    http_response_code(404);
    echo json_encode(['error' => 'User account not found or inactive.']);
    exit;
}

if ($supervisor['role'] !== 'supervisor') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. This report is for supervisors only.']);
    exit;
}

if (!$supervisor['department_id']) {
    http_response_code(422);
    echo json_encode(['error' => 'Your account is not assigned to a department. Please contact an administrator.']);
    exit;
}

$departmentId   = (int)$supervisor['department_id'];
$departmentName = $supervisor['department_name'];

// ----------------------------------------------------------------
// 3. Core query — same logic as get_daily_report.php
//    Scoped strictly to $departmentId (no override possible).
//
// COMPLETED : status = 'Completed' AND completed_at = today
// ONGOING   : status != 'Completed' AND deadline >= today
// OVERDUE   : status != 'Completed' AND deadline < today
// ----------------------------------------------------------------
$today     = date('Y-m-d');
$todayFull = date('Y-m-d 23:59:59');

// Summary totals for the department
$summarySql = "
    SELECT
        COUNT(DISTINCT t.id) AS total,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND DATE(t.completed_at) = CURDATE()
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
        (t.status = 'Completed' AND DATE(t.completed_at) = CURDATE())
        OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL)
    )
";

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute([$departmentId]);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

// Per-employee breakdown — only staff in this department
$employeeSql = "
    SELECT
        u.id,
        u.name,
        COALESCE(d.name, u.department) AS department,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND DATE(t.completed_at) = CURDATE()
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
            (t.status = 'Completed' AND DATE(t.completed_at) = CURDATE())
            OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL)
        )

    WHERE u.role = 'staff'
    AND u.is_active = 1
    AND u.department_id = ?

    GROUP BY u.id, u.name, d.name, u.department
    ORDER BY overdue DESC, completed DESC, u.name ASC
";

$empStmt = $conn->prepare($employeeSql);
$empStmt->execute([$departmentId]);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_map(function ($row) {
    return [
        'id'         => (int)$row['id'],
        'name'       => $row['name'],
        'department' => $row['department'],
        'completed'  => (int)($row['completed'] ?? 0),
        'ongoing'    => (int)($row['ongoing']   ?? 0),
        'overdue'    => (int)($row['overdue']   ?? 0),
    ];
}, $empRows);

// ----------------------------------------------------------------
// 4. Response
// ----------------------------------------------------------------
echo json_encode([
    'date' => $today,

    'department' => [
        'id'   => $departmentId,
        'name' => $departmentName,
    ],

    'supervisor' => [
        'id'   => (int)$supervisor['id'],
        'name' => $supervisor['name'],
    ],

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    // Array of staff members in this department with their task counts
    'employees' => $employees,
]);
