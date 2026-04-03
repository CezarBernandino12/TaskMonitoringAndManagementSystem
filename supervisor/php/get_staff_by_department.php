<?php
session_start();
require_once '../../config/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not logged in']);
    exit();
}

$supervisor_id = (int) $_SESSION['user_id'];

try {
    $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = :id LIMIT 1");
    $stmt->bindParam(':id', $supervisor_id, PDO::PARAM_INT);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor || empty($supervisor['department_id'])) {
        echo json_encode(['departments' => []]);
        exit();
    }

    $department_id = (int) $supervisor['department_id'];

    $stmt = $conn->prepare("
        SELECT
            d.id AS department_id,
            d.name AS department_name,
            u.id AS staff_id,
            u.name,
            u.email,
            u.contact,
            u.address
        FROM departments d
        LEFT JOIN users u
            ON u.department_id = d.id
            AND u.role = 'staff'
        WHERE d.id = :department_id
        ORDER BY d.name ASC, u.name ASC
    ");
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $departments = [];

    foreach ($rows as $row) {
        $departmentId = $row['department_id'];

        if (!isset($departments[$departmentId])) {
            $departments[$departmentId] = [
                'department_id' => $row['department_id'],
                'department_name' => $row['department_name'],
                'staff' => []
            ];
        }

        if (!empty($row['staff_id'])) {
            $departments[$departmentId]['staff'][] = [
                'id' => $row['staff_id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'contact' => $row['contact'],
                'address' => $row['address']
            ];
        }
    }

    echo json_encode([
        'departments' => array_values($departments)
    ]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error']);
}