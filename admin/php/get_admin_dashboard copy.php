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
    echo json_encode(['error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
    exit;
});
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => $e['message'], 'file' => basename($e['file']), 'line' => $e['line']]);
    }
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// 1. SYSTEM OVERVIEW — counts the admin needs to manage the system
// ====================================================================
$overviewStmt = $conn->query("
    SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1)               AS total_active_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 0)               AS total_inactive_users,
        (SELECT COUNT(*) FROM users WHERE role = 'staff' AND is_active = 1)      AS total_staff,
        (SELECT COUNT(*) FROM users WHERE role = 'supervisor' AND is_active = 1) AS total_supervisors,
        (SELECT COUNT(*) FROM departments)                             AS total_departments,
        (SELECT COUNT(*) FROM tasks)                                   AS total_tasks
");
$overview = $overviewStmt->fetch(PDO::FETCH_ASSOC);

// ====================================================================
// 2. TASK STATUS SNAPSHOT — real-time across all tasks right now
// ====================================================================
$taskStmt = $conn->query("
    SELECT
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END)                                         AS completed,
        SUM(CASE WHEN status NOT IN ('Completed') AND deadline IS NOT NULL AND DATE(deadline) >= CURDATE() THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN status NOT IN ('Completed') AND deadline IS NOT NULL AND DATE(deadline) < CURDATE()  THEN 1 ELSE 0 END) AS overdue,
        COUNT(*) AS total
    FROM tasks
");
$tasks = $taskStmt->fetch(PDO::FETCH_ASSOC);
$totalTasks = (int)($tasks['total'] ?? 0);
$overallRate = $totalTasks > 0 ? round(((int)$tasks['completed'] / $totalTasks) * 100) : 0;

// ====================================================================
// 3. RECENTLY REGISTERED USERS — last 5 new accounts
// ====================================================================
$recentUsersStmt = $conn->query("
    SELECT u.id, u.name, u.email, u.role, u.is_active,
           COALESCE(d.name, 'No Department') AS department,
           u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.created_at DESC
    LIMIT 5
");
$recentUsers = $recentUsersStmt->fetchAll(PDO::FETCH_ASSOC);
$recentUsers = array_map(function ($u) {
    return [
        'id'         => (int)$u['id'],
        'name'       => $u['name'],
        'email'      => $u['email'],
        'role'       => $u['role'],
        'is_active'  => (bool)$u['is_active'],
        'department' => $u['department'],
        'created_at' => $u['created_at'],
    ];
}, $recentUsers);

// ====================================================================
// 4. DEPARTMENT SUMMARY — staff count + task counts per department
// ====================================================================
$deptStmt = $conn->query("
    SELECT
        d.id,
        d.name AS department,
        COUNT(DISTINCT u.id) AS staff_count,
        COUNT(DISTINCT t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1 AND u.role = 'staff'
    LEFT JOIN tasks t ON t.assigned_to = u.id
    GROUP BY d.id, d.name
    ORDER BY d.name ASC
");
$deptRows = $deptStmt->fetchAll(PDO::FETCH_ASSOC);
$departments = array_map(function ($d) {
    $total = (int)$d['total_tasks'];
    $comp  = (int)$d['completed'];
    return [
        'id'              => (int)$d['id'],
        'department'      => $d['department'],
        'staff_count'     => (int)$d['staff_count'],
        'total_tasks'     => $total,
        'completed'       => $comp,
        'overdue'         => (int)$d['overdue'],
        'completion_rate' => $total > 0 ? round(($comp / $total) * 100) : 0,
    ];
}, $deptRows);

// ====================================================================
// 5. USER ROLE BREAKDOWN — for the pie chart
// ====================================================================
$roleStmt = $conn->query("
    SELECT role, COUNT(*) AS count
    FROM users
    WHERE is_active = 1
    GROUP BY role
    ORDER BY count DESC
");
$roles = $roleStmt->fetchAll(PDO::FETCH_ASSOC);
$roles = array_map(fn($r) => ['role' => $r['role'], 'count' => (int)$r['count']], $roles);

// ====================================================================
// 6. ACCOUNTS WITH NO TASKS ASSIGNED — admin action items
// ====================================================================
$noTasksStmt = $conn->query("
    SELECT u.id, u.name, u.email, u.role,
           COALESCE(d.name, 'No Department') AS department
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN tasks t ON t.assigned_to = u.id
    WHERE u.role = 'staff'
    AND u.is_active = 1
    AND t.id IS NULL
    ORDER BY u.name ASC
    LIMIT 10
");
$noTasks = $noTasksStmt->fetchAll(PDO::FETCH_ASSOC);
$noTasks = array_map(fn($u) => [
    'id'         => (int)$u['id'],
    'name'       => $u['name'],
    'email'      => $u['email'],
    'role'       => $u['role'],
    'department' => $u['department'],
], $noTasks);

// ====================================================================
// RESPONSE
// ====================================================================
echo json_encode([
    'overview'      => [
        'total_active_users'   => (int)$overview['total_active_users'],
        'total_inactive_users' => (int)$overview['total_inactive_users'],
        'total_staff'          => (int)$overview['total_staff'],
        'total_supervisors'    => (int)$overview['total_supervisors'],
        'total_departments'    => (int)$overview['total_departments'],
        'total_tasks'          => $totalTasks,
    ],
    'task_snapshot' => [
        'total'        => $totalTasks,
        'completed'    => (int)($tasks['completed'] ?? 0),
        'ongoing'      => (int)($tasks['ongoing']   ?? 0),
        'overdue'      => (int)($tasks['overdue']   ?? 0),
        'overall_rate' => $overallRate,
    ],
    'recent_users'  => $recentUsers,
    'departments'   => $departments,
    'roles'         => $roles,
    'no_tasks'      => $noTasks,
]);
