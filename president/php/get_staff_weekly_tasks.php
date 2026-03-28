<?php
require_once '../../config/db.php';
header('Content-Type: application/json');


$staff_identifier = isset($_GET['staff_id']) ? $_GET['staff_id'] : '';
if (!$staff_identifier) {
    echo json_encode([]);
    exit();
}

// If not numeric, treat as staff name and look up ID
if (!is_numeric($staff_identifier)) {
    $stmt = $conn->prepare("SELECT id FROM users WHERE name = :name LIMIT 1");
    $stmt->bindParam(':name', $staff_identifier);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && isset($row['id'])) {
        $staff_id = (int)$row['id'];
    } else {
        echo json_encode(['days' => [], 'daily' => []]);
        exit();
    }
} else {
    $staff_id = intval($staff_identifier);
}

try {
    // Get past 7 days
    $days = [];
    for ($i = 6; $i >= 0; $i--) {
        $days[] = date('Y-m-d', strtotime("-$i days"));
    }
    $daily = [];
    foreach ($days as $day) {
        $stmt = $conn->prepare("SELECT status, COUNT(*) as cnt FROM tasks WHERE assigned_to = :staff_id AND deadline = :day GROUP BY status");
        $stmt->bindParam(':staff_id', $staff_id, PDO::PARAM_INT);
        $stmt->bindParam(':day', $day);
        $stmt->execute();
        $counts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $ongoing = 0;
        $completed = 0;
        $overdue = 0;
        foreach ($counts as $row) {
            if ($row['status'] === 'Completed') $completed = $row['cnt'];
            else if ($row['status'] === 'Ongoing') $ongoing = $row['cnt'];
            else if ($row['status'] === 'Overdue') $overdue = $row['cnt'];
        }
        $daily[] = [
            'date' => $day,
            'ongoing' => (int)$ongoing,
            'completed' => (int)$completed,
            'overdue' => (int)$overdue
        ];
    }
    echo json_encode(['days' => $days, 'daily' => $daily]);
} catch (PDOException $e) {
    echo json_encode([]);
}
