<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

require_once '../../config/db.php'; // $conn should be defined here

try {
    $stmt = $conn->prepare('SELECT department_id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !$user['department_id']) {
        echo json_encode(['error' => 'No department found']);
        exit;
    }

    // Get department name
    $stmt2 = $conn->prepare('SELECT name FROM departments WHERE id = ? LIMIT 1');
    $stmt2->execute([$user['department_id']]);
    $dept = $stmt2->fetch(PDO::FETCH_ASSOC);

    if ($dept && $dept['name']) {
        echo json_encode(['department_name' => $dept['name']]);
    } else {
        echo json_encode(['error' => 'Department not found']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
