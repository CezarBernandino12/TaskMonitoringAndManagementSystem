<?php
date_default_timezone_set('Asia/Manila');
session_start();
require_once '../../config/db.php';

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);

// Check supervisor session
if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit();
}

$supervisor_id = $_SESSION['user_id'];

try {
    // Get supervisor department
    $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = :id");
    $stmt->bindParam(':id', $supervisor_id, PDO::PARAM_INT);
    $stmt->execute();
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dept) {
        echo json_encode([]);
        exit();
    }

    $department_id = $dept['department_id'];

    // Get all staff IDs in this department
    $stmt = $conn->prepare("
        SELECT id, name
        FROM users 
        WHERE department_id = :department_id AND role = 'staff'
    ");
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $staff_ids = array_column($staff, 'id');
    if (empty($staff_ids)) {
        echo json_encode([]);
        exit();
    }

    // Prepare placeholders for IN clause
    $placeholders = implode(',', array_fill(0, count($staff_ids), '?'));

    // Fetch tasks for these staff
    $stmt = $conn->prepare("
        SELECT t.id, t.title, t.start_date, t.deadline, t.status, t.priority, u.name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE t.assigned_to IN ($placeholders)
        ORDER BY t.deadline ASC
    ");

    // Bind staff IDs
    foreach ($staff_ids as $k => $id) {
        $stmt->bindValue(($k+1), $id, PDO::PARAM_INT);
    }

    $stmt->execute();
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Add overdue flag
    $today = date('Y-m-d');
    foreach ($tasks as &$task) {
        $task['is_overdue'] = ($task['status'] !== 'Completed' && $task['deadline'] < $today) ? true : false;
        $task['assigned_name'] = $task['name'];
    }
    unset($task);

    echo json_encode($tasks);

} catch (PDOException $e) {
    echo json_encode([]);
}