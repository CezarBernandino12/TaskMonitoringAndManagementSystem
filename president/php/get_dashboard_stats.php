<?php
require_once '../../config/db.php';

header('Content-Type: application/json');

$response = [
    'total_departments' => 0,
    'total_tasks' => 0,
    'completed_tasks' => 0,
    'completion_rate' => '0%'
];

try {
    // Total Departments
    $stmt = $conn->query("SELECT COUNT(*) as count FROM departments");
    $response['total_departments'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Total Tasks
    $stmt = $conn->query("SELECT COUNT(*) as count FROM tasks");
    $response['total_tasks'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Completed Tasks
    $stmt = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'");
    $response['completed_tasks'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Completion Rate
    if ($response['total_tasks'] > 0) {
        $rate = ($response['completed_tasks'] / $response['total_tasks']) * 100;
        $response['completion_rate'] = round($rate) . '%';
    }

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

echo json_encode($response);