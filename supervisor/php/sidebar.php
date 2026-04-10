<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

require_once '../../config/db.php';

function getInitials(string $name): string
{
    $name = trim($name);

    if ($name === '') {
        return 'U';
    }

    $parts = preg_split('/\s+/', $name);
    $parts = array_filter($parts);

    if (empty($parts)) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials !== '' ? $initials : 'U';
}

function getRoleLabel(string $role): string
{
    $role = strtolower(trim($role));

    return match ($role) {
        'admin' => 'Administrator',
        'supervisor' => 'Supervisor',
        'staff' => 'Staff',
        'executive' => 'Executive',
        default => ucfirst($role ?: 'User')
    };
}

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string) $profileImage);

    if ($profileImage === '') {
        return null;
    }

    return '../uploads/profiles/' . ltrim($profileImage, '/\\');
}

try {
    $userId = (int) $_SESSION['user_id'];

    $stmt = $conn->prepare("
        SELECT
            u.id,
            u.name,
            u.nickname,
            u.gender,
            u.email,
            u.role,
            u.profile_image,
            u.department_id,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $name = trim((string) ($row['name'] ?? ''));
    $nickname = trim((string) ($row['nickname'] ?? ''));
    $gender = trim((string) ($row['gender'] ?? ''));
    $email = trim((string) ($row['email'] ?? ''));
    $role = trim((string) ($row['role'] ?? ''));
    $departmentName = $row['department_name'] ?? null;
    $profileImage = $row['profile_image'] ?? null;

    echo json_encode([
        'id' => (int) $row['id'],
        'name' => $name,
        'nickname' => $nickname !== '' ? $nickname : null,
        'gender' => $gender !== '' ? $gender : null,
        'email' => $email,
        'role' => $role,
        'role_label' => getRoleLabel($role),
        'department_id' => isset($row['department_id']) ? (int) $row['department_id'] : null,
        'department_name' => $departmentName,
        'initials' => getInitials($name),
        'profile_image' => $profileImage,
        'profile_image_url' => getProfileImageUrl($profileImage)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit;
}