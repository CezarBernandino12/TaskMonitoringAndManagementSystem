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

$task_id     = isset($_POST['task_id']) ? (int) $_POST['task_id'] : 0;
$task_name   = trim($_POST['task_name'] ?? '');
$description = trim($_POST['description'] ?? '');
$start_date  = trim($_POST['start_date'] ?? '');
$deadline    = trim($_POST['deadline'] ?? '');
$priority    = trim($_POST['priority'] ?? 'Low');
$status      = trim($_POST['status'] ?? 'Ongoing');

$allowed_priorities = ['Low', 'Medium', 'High'];
$allowed_statuses   = ['Ongoing', 'Completed'];

if ($task_id <= 0) {
    http_response_code(400);
    echo "Invalid task ID";
    exit();
}

if ($task_name === '') {
    http_response_code(400);
    echo "Task name is required";
    exit();
}

if ($start_date === '' || $deadline === '') {
    http_response_code(400);
    echo "Start date and due date are required";
    exit();
}

if ($deadline < $start_date) {
    http_response_code(400);
    echo "Due date cannot be earlier than start date";
    exit();
}

if (!in_array($priority, $allowed_priorities, true)) {
    http_response_code(400);
    echo "Invalid priority value";
    exit();
}

if (!in_array($status, $allowed_statuses, true)) {
    http_response_code(400);
    echo "Invalid status value";
    exit();
}

try {
    // Fetch current status before updating so we can detect changes.
    $prevStmt = $conn->prepare(
        "SELECT status, created_by FROM tasks WHERE id = :id AND assigned_to = :user_id"
    );
    $prevStmt->bindValue(':id',      $task_id, PDO::PARAM_INT);
    $prevStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $prevStmt->execute();
    $prevTask = $prevStmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $conn->prepare("
        UPDATE tasks
        SET
            title = :title,
            description = :description,
            start_date = :start_date,
            deadline = :deadline,
            priority = :priority,
            status = :status
        WHERE id = :id
          AND assigned_to = :user_id
    ");

    $stmt->bindValue(':title', $task_name, PDO::PARAM_STR);
    $stmt->bindValue(':description', $description, PDO::PARAM_STR);
    $stmt->bindValue(':start_date', $start_date, PDO::PARAM_STR);
    $stmt->bindValue(':deadline', $deadline, PDO::PARAM_STR);
    $stmt->bindValue(':priority', $priority, PDO::PARAM_STR);
    $stmt->bindValue(':status', $status, PDO::PARAM_STR);
    $stmt->bindValue(':id', $task_id, PDO::PARAM_INT);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);

    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        // Notify the task creator when the assignee changes the status.
        if (
            $prevTask &&
            $prevTask['status'] !== $status &&
            (int) $prevTask['created_by'] !== $user_id
        ) {
            require_once '../../config/notifications.php';
            $createdBy = (int) $prevTask['created_by'];
            $safeTitle = htmlspecialchars($task_name, ENT_QUOTES, 'UTF-8');

            if ($status === 'Completed') {
                dispatchNotification(
                    $conn,
                    $createdBy,
                    $user_id,
                    'approval_request',
                    'Task Completed — Needs Review',
                    "\"{$safeTitle}\" has been marked as completed.",
                    $task_id,
                    "task-{$task_id}-approval"
                );
            } else {
                dispatchNotification(
                    $conn,
                    $createdBy,
                    $user_id,
                    'status_changed',
                    'Task Status Updated',
                    "\"{$safeTitle}\" is now {$status}.",
                    $task_id,
                    "task-{$task_id}-status-" . strtolower($status)
                );
            }
        }

        echo "Task updated successfully";
    } else {
        echo "Task not found or no changes made";
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo "Error updating task";
}