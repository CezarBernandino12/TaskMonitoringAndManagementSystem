<?php
require_once __DIR__ . '/_auth.php';
date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once '../../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit();
}

$user_id = (int) $_SESSION['user_id'];

try {
    $stmt = $conn->prepare("
        SELECT
            id,
            title,
            COALESCE(description, '') AS description,
            start_date,
            deadline,
            status,
            priority,
            COALESCE(progress_percentage, 0) AS progress_percentage
        FROM tasks
        WHERE assigned_to = :user_id
        ORDER BY deadline ASC, id DESC
    ");

    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $today = date('Y-m-d');

    foreach ($tasks as &$task) {
        $is_overdue = ($task['status'] !== 'Completed' && $task['deadline'] < $today);

        $task['is_overdue'] = $is_overdue;

        if ($is_overdue) {
            $task['status'] = 'Overdue';
        }

        $task['progress_percentage'] = (int) $task['progress_percentage'];
    }
    unset($task);

    echo json_encode($tasks);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([]);
}
