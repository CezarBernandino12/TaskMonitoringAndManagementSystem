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
            u.role,
            u.department_id,
            u.profile_image,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = ?
        LIMIT 1
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $roleLabel = ucwords(str_replace('_', ' ', $user['role']));
    $departmentName = $user['department_name'] ?: 'No Department';

    $parts = preg_split('/\s+/', trim($user['name']));
    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    echo json_encode([
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'role_label' => $roleLabel,
        'department_id' => $user['department_id'],
        'department_name' => $departmentName,
        'dashboard_title' => $departmentName . ' - ' . $roleLabel . ' Dashboard',
        'initials' => $initials ?: 'U',
        'profile_image' => $user['profile_image'],
        'profile_image_url' => !empty($user['profile_image'])
            ? 'uploads/profiles/' . $user['profile_image']
            : null
    ]);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit;
}