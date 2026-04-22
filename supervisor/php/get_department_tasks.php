<?php
date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once '../../config/db.php';

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(0);

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit();
}

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

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string) $profileImage);

    if ($profileImage === '') {
        return null;
    }

    return '../uploads/profiles/' . ltrim($profileImage, '/\\');
}

$supervisor_id = (int) $_SESSION['user_id'];

try {
    $stmt = $conn->prepare("
        SELECT department_id
        FROM users
        WHERE id = :id
        LIMIT 1
    ");
    $stmt->bindParam(':id', $supervisor_id, PDO::PARAM_INT);
    $stmt->execute();
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dept || empty($dept['department_id'])) {
        echo json_encode([]);
        exit();
    }

    $department_id = (int) $dept['department_id'];

    $stmt = $conn->prepare("
        SELECT id
        FROM users
        WHERE department_id = :department_id
          AND role = 'staff'
    ");
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $staff_ids = array_map('intval', array_column($staff, 'id'));

    if (empty($staff_ids)) {
        echo json_encode([]);
        exit();
    }

    $placeholders = implode(',', array_fill(0, count($staff_ids), '?'));

    $stmt = $conn->prepare("
        SELECT
            t.id,
            t.title,
            t.start_date,
            t.deadline,
            t.status,
            t.priority,
            u.id AS assigned_user_id,
            u.name AS assigned_name,
            u.profile_image AS assigned_profile_image
        FROM tasks t
        JOIN users u
            ON t.assigned_to = u.id
        WHERE t.assigned_to IN ($placeholders)
        ORDER BY
            CASE WHEN t.deadline IS NULL OR t.deadline = '' THEN 1 ELSE 0 END,
            t.deadline ASC,
            t.id DESC
    ");

    foreach ($staff_ids as $k => $id) {
        $stmt->bindValue($k + 1, $id, PDO::PARAM_INT);
    }

    $stmt->execute();
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $today = date('Y-m-d');

    foreach ($tasks as &$task) {
        $deadline = trim((string) ($task['deadline'] ?? ''));
        $status = trim((string) ($task['status'] ?? ''));

        $task['is_overdue'] =
            $deadline !== '' &&
            strcasecmp($status, 'Completed') !== 0 &&
            $deadline < $today;

        $assignedName = trim((string) ($task['assigned_name'] ?? ''));

        $task['assigned_name'] = $assignedName !== '' ? $assignedName : 'Unassigned';
        $task['assigned_initials'] = getInitials($task['assigned_name']);
        $task['assigned_profile_image_url'] = getProfileImageUrl($task['assigned_profile_image'] ?? null);
    }
    unset($task);

    echo json_encode($tasks);
} catch (PDOException $e) {
    echo json_encode([]);
}