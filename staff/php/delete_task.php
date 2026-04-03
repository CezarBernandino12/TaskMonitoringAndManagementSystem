<?php
date_default_timezone_set('Asia/Manila');

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Invalid request method";
    exit();
}

$task_id = $_POST['task_id'] ?? null;

if (!$task_id) {
    http_response_code(400);
    echo "Invalid task ID";
    exit();
}

try {
    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = :id");
    $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo "Task deleted successfully";
    } else {
        http_response_code(404);
        echo "Task not found";
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo "Error deleting task";
}