<?php
session_start();
require_once '../../config/db.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit();
}

function getInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $parts = array_values(array_filter($parts));

    if (!$parts) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials ?: 'U';
}

function getProfileImageUrl(?string $profileImage): string
{
    $profileImage = trim((string) $profileImage);

    if ($profileImage === '') {
        return '';
    }

    if (
        str_starts_with($profileImage, 'http://') ||
        str_starts_with($profileImage, 'https://') ||
        str_starts_with($profileImage, '/') ||
        str_starts_with($profileImage, './') ||
        str_starts_with($profileImage, '../')
    ) {
        return $profileImage;
    }

    return '../uploads/profiles/' . ltrim($profileImage, "/\\");
}

function formatLastActiveLabel(?string $lastActiveAt): string
{
    if (!$lastActiveAt) {
        return 'recently';
    }

    $timestamp = strtotime($lastActiveAt);
    if (!$timestamp) {
        return 'recently';
    }

    $elapsed = time() - $timestamp;
    if ($elapsed <= 120) {
        return 'now';
    }

    if ($elapsed < 3600) {
        $minutes = max(1, (int) floor($elapsed / 60));
        return $minutes . ' min ago';
    }

    if ($elapsed < 86400) {
        $hours = max(1, (int) floor($elapsed / 3600));
        return $hours . ' hr ago';
    }

    $days = max(1, (int) floor($elapsed / 86400));
    return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
}

$supervisorId = (int) $_SESSION['user_id'];

try {
    $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = :id LIMIT 1");
    $stmt->bindParam(':id', $supervisorId, PDO::PARAM_INT);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor || empty($supervisor['department_id'])) {
        echo json_encode(['departments' => []]);
        exit();
    }

    $departmentId = (int) $supervisor['department_id'];

    $stmt = $conn->prepare(" 
        SELECT
            d.id AS department_id,
            d.name AS department_name,
            u.id AS staff_id,
            u.employee_id,
            u.name,
            u.email,
            u.contact,
            u.address,
            u.role,
            u.profile_image,
            u.last_active_at,
            u.is_active
        FROM departments d
        LEFT JOIN users u
            ON u.department_id = d.id
            AND u.role = 'staff'
        WHERE d.id = :department_id
        ORDER BY d.name ASC, u.is_active DESC, u.name ASC
    ");
    $stmt->bindParam(':department_id', $departmentId, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $departments = [];

    foreach ($rows as $row) {
        $currentDepartmentId = (int) $row['department_id'];

        if (!isset($departments[$currentDepartmentId])) {
            $departments[$currentDepartmentId] = [
                'department_id' => $currentDepartmentId,
                'department_name' => $row['department_name'],
                'staff' => []
            ];
        }

        if (!empty($row['staff_id'])) {
            $label = formatLastActiveLabel($row['last_active_at'] ?? null);
            $departments[$currentDepartmentId]['staff'][] = [
                'id' => (int) $row['staff_id'],
                'employee_id' => $row['employee_id'] ?? null,
                'name' => $row['name'],
                'email' => $row['email'],
                'contact' => $row['contact'],
                'address' => $row['address'],
                'role' => $row['role'] ?? 'staff',
                'profile_image' => $row['profile_image'] ?? null,
                'profile_image_url' => getProfileImageUrl($row['profile_image'] ?? null),
                'initials' => getInitials($row['name'] ?? ''),
                'is_active' => (int) ($row['is_active'] ?? 0) === 1,
                'is_active_now' => (int) ($row['is_active'] ?? 0) === 1,
                'last_active_at' => $row['last_active_at'] ?? null,
                'last_active_label' => $label,
                'department_id' => $currentDepartmentId,
                'department_name' => $row['department_name']
            ];
        }
    }

    echo json_encode([
        'departments' => array_values($departments)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
