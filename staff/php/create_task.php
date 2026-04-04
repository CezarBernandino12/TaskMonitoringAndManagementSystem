<?php

session_start();
require_once '../../config/db.php';

header('Content-Type: text/plain; charset=UTF-8');
date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Invalid request method.';
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo 'Error: User not logged in.';
    exit();
}

$task_name   = trim($_POST['task_name'] ?? '');
$description = isset($_POST['description']) ? trim($_POST['description']) : '';
$start_date  = trim($_POST['start_date'] ?? '');
$deadline    = trim($_POST['deadline'] ?? '');
$priority    = trim($_POST['priority'] ?? '');

$created_by  = (int) $_SESSION['user_id'];
$assigned_to = (int) $_SESSION['user_id'];

if ($task_name === '') {
    http_response_code(400);
    echo 'Task name is required.';
    exit();
}

if ($start_date === '' || $deadline === '') {
    http_response_code(400);
    echo 'Start date and deadline are required.';
    exit();
}

$allowed_priorities = ['Low', 'Medium', 'High'];
if (!in_array($priority, $allowed_priorities, true)) {
    http_response_code(400);
    echo 'Invalid priority value.';
    exit();
}

$start_obj = DateTime::createFromFormat('Y-m-d', $start_date);
$deadline_obj = DateTime::createFromFormat('Y-m-d', $deadline);

$valid_start = $start_obj && $start_obj->format('Y-m-d') === $start_date;
$valid_deadline = $deadline_obj && $deadline_obj->format('Y-m-d') === $deadline;

if (!$valid_start || !$valid_deadline) {
    http_response_code(400);
    echo 'Invalid date format.';
    exit();
}

if ($deadline < $start_date) {
    http_response_code(400);
    echo 'Deadline cannot be earlier than start date.';
    exit();
}

$today = date('Y-m-d');
$status = ($deadline < $today) ? 'Overdue' : 'Ongoing';

/*
 * Keep description optional:
 * - save NULL when empty
 * - save text when provided
 */
$description_value = ($description === '') ? null : $description;

try {
    $stmt = $conn->prepare("
        INSERT INTO tasks
            (title, description, created_by, assigned_to, department_id, start_date, deadline, priority, status)
        SELECT
            :task_name,
            :description,
            :created_by,
            :assigned_to,
            u.department_id,
            :start_date,
            :deadline,
            :priority,
            :status
        FROM users u
        WHERE u.id = :assigned_to
        LIMIT 1
    ");

    $stmt->bindValue(':task_name', $task_name, PDO::PARAM_STR);

    if ($description_value === null) {
        $stmt->bindValue(':description', null, PDO::PARAM_NULL);
    } else {
        $stmt->bindValue(':description', $description_value, PDO::PARAM_STR);
    }

    $stmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
    $stmt->bindValue(':assigned_to', $assigned_to, PDO::PARAM_INT);
    $stmt->bindValue(':start_date', $start_date, PDO::PARAM_STR);
    $stmt->bindValue(':deadline', $deadline, PDO::PARAM_STR);
    $stmt->bindValue(':priority', $priority, PDO::PARAM_STR);
    $stmt->bindValue(':status', $status, PDO::PARAM_STR);

    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo 'Task created successfully.';
    } else {
        http_response_code(400);
        echo 'Error: User not found or no department assigned.';
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo 'Error creating task.';
}