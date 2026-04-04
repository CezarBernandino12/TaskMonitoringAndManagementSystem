<?php
date_default_timezone_set('Asia/Manila');

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Invalid request method";
    exit();
}

$task_id = $_POST['task_id'] ?? null;
$priority = $_POST['priority'] ?? null;

if (!$task_id || !$priority) {
    http_response_code(400);
    echo "Invalid data";
    exit();
}

$allowed_priorities = ['High', 'Medium', 'Low'];

if (!in_array($priority, $allowed_priorities, true)) {
    http_response_code(400);
    echo "Invalid priority";
    exit();
}

try {
    $stmt = $conn->prepare("
        UPDATE tasks
        SET priority = :priority
        WHERE id = :id
    ");
    $stmt->bindParam(':priority', $priority, PDO::PARAM_STR);
    $stmt->bindParam(':id', $task_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo "Priority updated successfully";
    } else {
        echo "Priority updated successfully";
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo "Error updating priority";
}