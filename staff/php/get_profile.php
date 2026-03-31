<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

require_once '../../config/db.php';

try {
    $stmt = $conn->prepare("
        SELECT
            u.id,
            u.name,
            u.email,
            u.contact,
            u.address,
            u.profile_image,
            u.department_id,
            u.role,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = ?
        LIMIT 1
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $row['profile_image_url'] = !empty($row['profile_image'])
        ? 'uploads/profiles/' . $row['profile_image']
        : null;

    echo json_encode($row);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}