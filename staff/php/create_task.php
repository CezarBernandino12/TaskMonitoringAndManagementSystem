<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_SESSION['user_id'])) {
        echo "Error: User not logged in.";
        exit();
    }


    $task_name = $_POST['task_name'];
    $description = $_POST['description'];
    $created_by = $_SESSION['user_id'];
    $assigned_to = $_SESSION['user_id'];
    $start_date = $_POST['start_date'];
    $deadline = $_POST['deadline'];
    $priority = $_POST['priority'];

    // Determine status: Overdue if deadline < today, else Ongoing
    date_default_timezone_set('Asia/Manila');
    $today = date('Y-m-d');
    if ($deadline < $today) {
        $status = 'Overdue';
    } else {
        $status = 'Ongoing';
    }

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
        ");

        $stmt->bindParam(':task_name', $task_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':created_by', $created_by);
        $stmt->bindParam(':assigned_to', $assigned_to);
        $stmt->bindParam(':start_date', $start_date);
        $stmt->bindParam(':deadline', $deadline);
        $stmt->bindParam(':priority', $priority);
        $stmt->bindParam(':status', $status);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo "Task created successfully.";
            } else {
                echo "Error: User not found or no department assigned.";
            }
        } else {
            echo "Error creating task.";
        }

    } catch(PDOException $e) {
        echo "Error: " . $e->getMessage();
    }
}