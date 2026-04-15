<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

function getInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $parts = array_filter($parts);

    if (empty($parts)) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials ?: 'U';
}

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string)$profileImage);

    if ($profileImage === '') {
        return null;
    }

    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/');

    return $basePath . '/uploads/profiles/' . rawurlencode($profileImage);
}

$stmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.email,
        u.profile_image,
        COALESCE(d.name, 'No Department') AS department,
        u.department_id
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.is_active = 1
      AND u.role = 'staff'
    ORDER BY d.name ASC, u.name ASC
");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_map(function ($row) {
    return [
        'id'                => (int)$row['id'],
        'name'              => $row['name'],
        'email'             => $row['email'],
        'department'        => $row['department'],
        'department_id'     => (int)$row['department_id'],
        'profile_image'     => $row['profile_image'] ?? null,
        'profile_image_url' => getProfileImageUrl($row['profile_image'] ?? null),
        'initials'          => getInitials($row['name'] ?? ''),
    ];
}, $rows);

echo json_encode($employees);