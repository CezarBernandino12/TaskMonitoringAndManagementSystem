<?php
// ====================================================================
// get_users.php
// Returns all users joined with their department name.
// Supports optional GET filters: role, department_id, is_active, search
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ----------------------------------------------------------------
// Optional filters
// ----------------------------------------------------------------
$conditions = ['1=1'];
$params     = [];

if (!empty($_GET['role'])) {
    $conditions[] = 'u.role = ?';
    $params[]     = $_GET['role'];
}
if (isset($_GET['department_id']) && $_GET['department_id'] !== '') {
    $conditions[] = 'u.department_id = ?';
    $params[]     = (int)$_GET['department_id'];
}
if (isset($_GET['is_active']) && $_GET['is_active'] !== '') {
    $conditions[] = 'u.is_active = ?';
    $params[]     = (int)$_GET['is_active'];
}
if (!empty($_GET['search'])) {
    $q            = '%' . $_GET['search'] . '%';
    $conditions[] = '(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)';
    array_push($params, $q, $q, $q);
}

$where = implode(' AND ', $conditions);

$stmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.nickname,
        u.email,
        u.role,
        u.contact,
        u.address,
        u.gender,
        u.date_of_birth,
        u.is_active,
        u.department,
        u.department_id,
        u.employee_id,
        u.profile_image,
        u.created_at,
        u.updated_at,
        COALESCE(d.name, u.department) AS department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE $where
    ORDER BY u.name ASC
");
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);


$users = array_map(function ($row) {
    return [
        'id'             => (int)$row['id'],
        'name'           => $row['name'],
        'nickname'       => $row['nickname'],
        'email'          => $row['email'],
        'role'           => $row['role'],
        'contact'        => $row['contact'],
        'address'        => $row['address'],
        'gender'         => $row['gender'],
        'date_of_birth'  => $row['date_of_birth'],
        'is_active'      => (int)$row['is_active'],
        'department'     => $row['department_name'] ?? $row['department'],
        'department_id'  => $row['department_id'] ? (int)$row['department_id'] : null,
        'employee_id'    => $row['employee_id'],
        'profile_image'  => $row['profile_image'],
        'created_at'     => $row['created_at'],
        'updated_at'     => $row['updated_at'],
    ];
}, $rows);

echo json_encode($users);
