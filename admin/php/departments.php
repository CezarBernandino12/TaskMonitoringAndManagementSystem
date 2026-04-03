<?php
header('Content-Type: application/json');
require_once '../../config/db.php';

try {
    if (!isset($conn)) {
        throw new Exception('Database connection not established.');
    }
    $stmt = $conn->query("SELECT id, name FROM departments ORDER BY name ASC");
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['departments' => $departments]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch departments.']);
}