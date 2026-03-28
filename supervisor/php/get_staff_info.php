<?php
// Get staff personal info by ID
require_once '../../config/db.php';
header('Content-Type: application/json');

if (!isset($_GET['id'])) {
    echo json_encode(['error' => 'No staff ID provided']);
    exit();
}

$staff_id = intval($_GET['id']);

try {
    $stmt = $conn->prepare("SELECT id, name, email, role, department_id, contact, address FROM users WHERE id = :id AND role = 'staff' LIMIT 1");
    $stmt->bindParam(':id', $staff_id, PDO::PARAM_INT);
    $stmt->execute();
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($staff) {
        echo json_encode($staff);
    } else {
        echo json_encode(['error' => 'Staff not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error']);
}
