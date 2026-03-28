<?php
date_default_timezone_set('Asia/Manila');

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $task_id = $_POST['task_id'] ?? null;

    if (!$task_id) {
        echo "Invalid task ID";
        exit();
    }

    try {
        $stmt = $conn->prepare("DELETE FROM tasks WHERE id = :id");
        $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
        $stmt->execute();

        echo "Task deleted successfully";

    } catch (PDOException $e) {
        echo "Error deleting task";
    }
}