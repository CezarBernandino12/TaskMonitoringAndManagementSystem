<?php

date_default_timezone_set('Asia/Manila');
session_start();
require_once '../../config/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
	echo json_encode([]);
	exit();
}

$user_id = $_SESSION['user_id'];

try {
	// Only retrieve tasks where assigned_to matches the logged-in user
	$stmt = $conn->prepare("SELECT id, title, start_date, deadline, status, priority FROM tasks WHERE assigned_to = :user_id ORDER BY deadline ASC");
	$stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
	$stmt->execute();
	$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

	$today = date('Y-m-d');
	foreach ($tasks as &$task) {
		$task['is_overdue'] = ($task['status'] !== 'Completed' && $task['deadline'] < $today) ? true : false;
	}
	unset($task);

	echo json_encode($tasks);
} catch (PDOException $e) {
	echo json_encode([]);
}
