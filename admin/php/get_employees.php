<?php
// ====================================================================
// get_employees.php
// Returns all active staff employees for the event tagging picker.
// Only accessible to authenticated users.
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

$stmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(d.name, 'No Department') AS department,
        u.department_id
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.is_active = 1
    AND u.role = 'staff'
    ORDER BY d.name ASC, u.name ASC
");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_map(function ($row) {
    return [
        'id'            => (int)$row['id'],
        'name'          => $row['name'],
        'email'         => $row['email'],
        'department'    => $row['department'],
        'department_id' => (int)$row['department_id'],
    ];
}, $rows);

echo json_encode($employees);
