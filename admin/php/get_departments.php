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
    echo json_encode(['error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
    exit;
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// FETCH DEPARTMENTS
// ====================================================================
// Returns all departments with:
//   id            — used as option value in the department filter dropdown
//   name          — displayed as the option label
//   supervisor_id — included in case other pages need it
//   staff_count   — number of active staff assigned to this department
//
// Used by:
//   - UserManagementPage  → department filter dropdown + UserDrawer + UserFormModal
//   - Any other page that calls php/get_departments.php
// ====================================================================

$stmt = $conn->query("
    SELECT
        d.id,
        d.name,
        d.supervisor_id,
        COUNT(u.id) AS staff_count
    FROM departments d
    LEFT JOIN users u
        ON u.department_id = d.id
        AND u.is_active = 1
        AND u.role = 'staff'
    GROUP BY d.id, d.name, d.supervisor_id
    ORDER BY d.name ASC
");

$departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Cast types so JSON doesn't return strings for numeric fields
$departments = array_map(function ($d) {
    return [
        'id'            => (int)$d['id'],
        'name'          => $d['name'],
        'supervisor_id' => $d['supervisor_id'] !== null ? (int)$d['supervisor_id'] : null,
        'staff_count'   => (int)$d['staff_count'],
    ];
}, $departments);

echo json_encode($departments);