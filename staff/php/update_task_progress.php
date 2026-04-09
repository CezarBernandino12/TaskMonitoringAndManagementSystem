<?php

date_default_timezone_set('Asia/Manila');
session_start();
require_once '../../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Unauthorized.'
    ]);
    exit();
}

$user_id   = (int) $_SESSION['user_id'];
$task_id   = isset($_POST['task_id']) ? (int) $_POST['task_id'] : 0;
$direction = isset($_POST['direction']) ? trim($_POST['direction']) : '';
$step      = isset($_POST['step']) ? (int) $_POST['step'] : 10;

$step = max(1, min(100, $step));

if ($task_id <= 0 || !in_array($direction, ['increase', 'decrease'], true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Invalid request.'
    ]);
    exit();
}

try {
    $checkStmt = $conn->prepare("
        SELECT id, COALESCE(progress_percentage, 0) AS progress_percentage
        FROM tasks
        WHERE id = :task_id
          AND assigned_to = :user_id
        LIMIT 1
    ");

    $checkStmt->bindValue(':task_id', $task_id, PDO::PARAM_INT);
    $checkStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $checkStmt->execute();

    $task = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$task) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'status' => 'error',
            'message' => 'Task not found.'
        ]);
        exit();
    }

    $current_progress = (int) $task['progress_percentage'];

    if ($direction === 'increase') {
        $new_progress = min(100, $current_progress + $step);
    } else {
        $new_progress = max(0, $current_progress - $step);
    }

    $updateStmt = $conn->prepare("
        UPDATE tasks
        SET progress_percentage = :progress_percentage
        WHERE id = :task_id
          AND assigned_to = :user_id
    ");

    $updateStmt->bindValue(':progress_percentage', $new_progress, PDO::PARAM_INT);
    $updateStmt->bindValue(':task_id', $task_id, PDO::PARAM_INT);
    $updateStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'status' => 'success',
        'message' => $direction === 'increase'
            ? 'Task progress increased successfully.'
            : 'Task progress decreased successfully.',
        'progress_percentage' => $new_progress
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Server error while updating task progress.'
    ]);
}