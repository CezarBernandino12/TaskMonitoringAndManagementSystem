<?php
require_once '../../config/db.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name']) || trim($data['name']) === '') {
    echo json_encode(['success' => false, 'message' => 'Department name required']);
    exit;
}
$name = $conn->real_escape_string($data['name']);
if (isset($data['id'])) {
    // Update
    $id = intval($data['id']);
    $sql = "UPDATE departments SET name='$name' WHERE id=$id";
    if ($conn->query($sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Update failed']);
    }
} else {
    // Insert
    $sql = "INSERT INTO departments (name) VALUES ('$name')";
    if ($conn->query($sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Insert failed']);
    }
}
$conn->close();
