<?php
require_once __DIR__ . '/_auth.php';
date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) { session_start(); }

require_once '../../config/db.php';
require_once '../../config/notifications.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $task_id = $_POST['task_id'] ?? null;
    $status = $_POST['status'] ?? null;

    if (!$task_id || !$status) {
        echo "Invalid data";
        exit();
    }

    try {
        $stmt = $conn->prepare("SELECT deadline, title, created_by FROM tasks WHERE id = :id");
        $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
        $stmt->execute();
        $task = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$task) {
            echo "Task not found";
            exit();
        }

        $now = new DateTime();
        $deadline = new DateTime($task['deadline']);

        $nowDate = $now->format('Y-m-d');
        $deadlineDate = $deadline->format('Y-m-d');

        if ($deadlineDate < $nowDate && $status !== 'Completed') {
            $status = 'Overdue';
        }

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
                SET status = :status, completed_at = NULL
                WHERE id = :id
            ");
        }

        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
        $stmt->execute();

        // Dispatch notifications to the task creator when status changes.
        $actorId    = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        $createdBy  = (int) $task['created_by'];
        $taskTitle  = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8');
        $taskIdInt  = (int) $task_id;

        // Only notify if the actor is different from the creator.
        if ($actorId !== null && $actorId !== $createdBy) {
            if ($status === 'Completed') {
                // Approval request: supervisor needs to review the completed task.
                dispatchNotification(
                    $conn,
                    $createdBy,
                    $actorId,
                    'approval_request',
                    'Task Completed — Needs Review',
                    "\"{$taskTitle}\" has been marked as completed.",
                    $taskIdInt,
                    "task-{$taskIdInt}-approval"
                );
            } else {
                // General status update.
                dispatchNotification(
                    $conn,
                    $createdBy,
                    $actorId,
                    'status_changed',
                    'Task Status Updated',
                    "\"{$taskTitle}\" is now {$status}.",
                    $taskIdInt,
                    "task-{$taskIdInt}-status-" . strtolower($status)
                );
            }
        }

        echo "Status updated successfully";

    } catch (PDOException $e) {
        echo "Error updating task";
    }
}