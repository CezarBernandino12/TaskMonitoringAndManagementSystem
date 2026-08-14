<?php
require_once __DIR__ . '/_auth.php';
// ====================================================================
// get_strategic_plan.php
//
// Returns everything the form needs in a single call:
//   {
//     plan:        { id, plan_title, department, vision, mission,
//                    prepared_by, prepared_by_title } | null,
//     goals:       [ { id, sort_order, goal, objectives, plans[],
//                      timeline, personnel, metric, remarks } ],
//     dept_users:  [ { id, name, role } ],   // active users in the
//                                             // same department
//   }
//
// ?plan_id=N  → load a specific saved plan
// (no param)  → return null plan (blank form), just dept_users
//
// Auth: reads $_SESSION['user_id'] to resolve the department.
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function ($s, $m, $f, $l) { throw new ErrorException($m, 0, $s, $f, $l); });
set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => $e['message']]);
    }
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');


// ── AUTH ─────────────────────────────────────────────────────────────
$currentUserId = $_SESSION['user_id'] ?? null;

// Resolve the current user's department
$departmentId = null;
$currentUserName = null;
$currentUserRole = null;

$currentUserDept     = null;
$currentUserPosition = null;

if ($currentUserId) {
    $uStmt = $conn->prepare("
        SELECT u.id, u.name, u.role, u.department_id,
               u.department,
               COALESCE(
                   (SELECT d.name FROM departments d WHERE d.id = u.department_id LIMIT 1),
                   u.department
               ) AS dept_name
        FROM users u
        WHERE u.id = ? AND u.is_active = 1
    ");
    $uStmt->execute([$currentUserId]);
    $currentUser = $uStmt->fetch(PDO::FETCH_ASSOC);
    if ($currentUser) {
        $departmentId        = $currentUser['department_id'];
        $currentUserName     = $currentUser['name'];
        $currentUserRole     = $currentUser['role'];
        $currentUserDept     = $currentUser['dept_name'] ?? $currentUser['department'] ?? null;
        // Derive a human-readable position from the role enum
        $roleLabels = [
            'admin'              => 'Administrator',
            'supervisor'         => 'Supervisor',
            'staff'              => 'Staff',
            'executive_director' => 'Executive Director',
            'president'          => 'President',
        ];
        $currentUserPosition = $roleLabels[$currentUserRole] ?? ucwords(str_replace('_', ' ', $currentUserRole));
    }
}

// ── DEPT USERS ───────────────────────────────────────────────────────
// Fetch all active users in the same department so the frontend
// can offer them as choices for Lead Personnel.
$deptUsers = [];
if ($departmentId) {
    $duStmt = $conn->prepare("
        SELECT u.id, u.name, u.role
        FROM users u
        WHERE u.department_id = ?
          AND u.is_active = 1
        ORDER BY
            FIELD(u.role, 'supervisor', 'staff', 'admin') ASC,
            u.name ASC
    ");
    $duStmt->execute([$departmentId]);
    $deptUsers = array_map(fn($r) => [
        'id'   => (int)$r['id'],
        'name' => $r['name'],
        'role' => $r['role'],
    ], $duStmt->fetchAll(PDO::FETCH_ASSOC));
}

// ── ALL USERS (executive director + president for Noted By) ──────────
$allUsers = [];
$auStmt = $conn->prepare("
    SELECT u.id, u.name, u.role
    FROM users u
    WHERE u.role IN ('executive_director', 'president')
      AND u.is_active = 1
    ORDER BY FIELD(u.role, 'executive_director', 'president') ASC
");
$auStmt->execute();
$allUsers = array_map(fn($r) => [
    'id'   => (int)$r['id'],
    'name' => $r['name'],
    'role' => $r['role'],
], $auStmt->fetchAll(PDO::FETCH_ASSOC));

// ── PLAN DATA ────────────────────────────────────────────────────────
$planId = isset($_GET['plan_id']) ? (int)$_GET['plan_id'] : 0;

$plan  = null;
$goals = [];

if ($planId > 0) {
    // Fetch plan header
    $pStmt = $conn->prepare("
        SELECT id, plan_title, department, vision, mission,
               prepared_by, prepared_by_title,
               noted_by_exec_dir, noted_by_president,
               created_at
        FROM strategic_plans
        WHERE id = ?
    ");
    $pStmt->execute([$planId]);
    $planRow = $pStmt->fetch(PDO::FETCH_ASSOC);

    if ($planRow) {
        $plan = [
            'id'                  => (int)$planRow['id'],
            'plan_title'          => $planRow['plan_title'],
            'department'          => $planRow['department'],
            'vision'              => $planRow['vision'],
            'mission'             => $planRow['mission'],
            'prepared_by'         => $planRow['prepared_by'],
            'prepared_by_title'   => $planRow['prepared_by_title']   ?? '',
            'noted_by_exec_dir'   => $planRow['noted_by_exec_dir']   ?? '',
            'noted_by_president'  => $planRow['noted_by_president']  ?? '',
            'created_at'          => $planRow['created_at'],
        ];

        // Fetch goals
        $gStmt = $conn->prepare("
            SELECT id, sort_order, goal, objectives, plans,
                   timeline, personnel, metric, remarks
            FROM strategic_plan_goals
            WHERE plan_id = ?
            ORDER BY sort_order ASC, id ASC
        ");
        $gStmt->execute([$planId]);
        $goalRows = $gStmt->fetchAll(PDO::FETCH_ASSOC);

        $goals = array_map(fn($g) => [
            'id'         => (int)$g['id'],
            'sort_order' => (int)$g['sort_order'],
            'goal'       => $g['goal'],
            'objectives' => $g['objectives'] ?? '',
            'plans'      => json_decode($g['plans'] ?? '[]', true) ?? [],
            'timeline'   => $g['timeline']  ?? '',
            // personnel is stored as newline-separated string in DB;
            // we also return it as an array for the multi-select
            'personnel'       => $g['personnel'] ?? '',
            'personnel_names' => array_values(array_filter(
                array_map('trim', explode("\n", $g['personnel'] ?? ''))
            )),
            'metric'  => $g['metric']  ?? '',
            'remarks' => $g['remarks'] ?? '',
        ], $goalRows);
    }
}

echo json_encode([
    'plan'         => $plan,
    'goals'        => $goals,
    'dept_users'   => $deptUsers,
    'all_users'    => $allUsers,
    'current_user' => $currentUserId ? [
        'id'         => (int)$currentUserId,
        'name'       => $currentUserName,
        'role'       => $currentUserRole,
        'department' => $currentUserDept,
        'position'   => $currentUserPosition,
    ] : null,
]);