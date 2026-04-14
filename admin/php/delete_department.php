<?php
require_once '../../config/db.php';
require_once '../../config/log_activity.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['id'])) {
    echo json_encode(['success' => false, 'message' => 'Department ID required']);
    exit;
}
$id = intval($data['id']);
// Capture name before deleting
$nameRow = $conn->query("SELECT name FROM departments WHERE id=$id LIMIT 1")->fetch_assoc();
$deptName = $nameRow['name'] ?? "ID {$id}";

$sql = "DELETE FROM departments WHERE id=$id";
if ($conn->query($sql)) {
    logActivity($conn, 'department.deleted', 'department', $id, "Deleted department: {$deptName}");
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Delete failed']);
}
$conn->close();
