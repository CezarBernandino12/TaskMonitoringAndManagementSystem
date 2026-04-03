<?php
require_once '../../config/db.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['id'])) {
    echo json_encode(['success' => false, 'message' => 'Department ID required']);
    exit;
}
$id = intval($data['id']);
$sql = "DELETE FROM departments WHERE id=$id";
if ($conn->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Delete failed']);
}
$conn->close();
