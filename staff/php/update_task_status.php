<?php
date_default_timezone_set('Asia/Manila');

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $task_id = $_POST['task_id'] ?? null;
    $status = $_POST['status'] ?? null;

    if (!$task_id || !$status) {
        echo "Invalid data";
        exit();
    }

    try {
        // 🔍 Get task deadline first
        $stmt = $conn->prepare("SELECT deadline FROM tasks WHERE id = :id");
        $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
        $stmt->execute();
        $task = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$task) {
            echo "Task not found";
            exit();
        }

        $now = new DateTime();
        $deadline = new DateTime($task['deadline']);

        // 🔥 Force overdue if past deadline and not completed
        if ($deadline < $now && $status !== 'Completed') {
            $status = 'Overdue';
        }

        // ✅ Handle update
        if ($status === 'Completed') {
            $completed_at = $now->format('Y-m-d H:i:s');

            $stmt = $conn->prepare("
                UPDATE tasks 
                SET status = :status, completed_at = :completed_at 
                WHERE id = :id
            ");
            $stmt->bindParam(':completed_at', $completed_at);

        } else {
            $stmt = $conn->prepare("
                UPDATE tasks 
                SET status = :status 
                WHERE id = :id
            ");
        }

        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
        $stmt->execute();

        echo "Status updated successfully";

    } catch (PDOException $e) {
        echo "Error updating task";
    }
}