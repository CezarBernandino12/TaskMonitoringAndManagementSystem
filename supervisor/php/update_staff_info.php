<?php
require_once '../../config/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Invalid request']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['id'])) {
    echo json_encode(['error' => 'No staff ID provided']);
    exit();
}

$staff_id = intval($data['id']);

try {
    $fields = [];
    $params = [':id' => $staff_id];
    if (isset($data['name'])) {
        $fields[] = 'name = :name';
        $params[':name'] = $data['name'];
    }
    if (isset($data['email'])) {
        $fields[] = 'email = :email';
        $params[':email'] = $data['email'];
    }
    if (isset($data['contact'])) {
        $fields[] = 'contact = :contact';
        $params[':contact'] = $data['contact'];
    }
    if (isset($data['address'])) {
        $fields[] = 'address = :address';
        $params[':address'] = $data['address'];
    }
    if (empty($fields)) {
        echo json_encode(['error' => 'No fields to update']);
        exit();
    }
    $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id AND role = "staff"';
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error']);
}
