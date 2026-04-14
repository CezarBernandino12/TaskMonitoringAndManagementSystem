<?php
date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Invalid request method";
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo "Unauthorized";
    exit();
}

$user_id = (int) $_SESSION['user_id'];
$task_id = isset($_POST['task_id']) ? (int) $_POST['task_id'] : 0;

if ($task_id <= 0) {
    http_response_code(400);
    echo "Invalid task ID";
    exit();
}

try {
    $stmt = $conn->prepare("
        DELETE FROM tasks
        WHERE id = :id
          AND assigned_to = :user_id
    ");

    $stmt->bindValue(':id', $task_id, PDO::PARAM_INT);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo "Task deleted successfully";
    } else {
        http_response_code(404);
        echo "Task not found or not allowed";
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo "Error deleting task";
}
