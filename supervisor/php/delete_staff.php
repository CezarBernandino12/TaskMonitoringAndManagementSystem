<?php
require_once __DIR__ . '/_auth.php';
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
    $stmt = $conn->prepare('DELETE FROM users WHERE id = :id AND role = "staff"');
    $stmt->bindParam(':id', $staff_id, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error']);
}
