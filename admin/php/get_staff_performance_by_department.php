<?php
require_once '../../config/db.php';
header('Content-Type: application/json');

$department = isset($_GET['department']) ? $_GET['department'] : '';
if (!$department) {
    echo json_encode([]);
    exit();
}

try {
    // Get department ID
    $stmt = $conn->prepare("SELECT id FROM departments WHERE name = :name LIMIT 1");
    $stmt->bindParam(':name', $department);
    $stmt->execute();
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$dept) {
        echo json_encode([]);
        exit();
    }
    $department_id = $dept['id'];

    // Get staff in department
    $stmt = $conn->prepare("SELECT id, name FROM users WHERE department_id = :department_id AND role = 'staff'");
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->execute();
    $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    $today = date('Y-m-d');
    foreach ($staffs as $staff) {
        $staff_id = $staff['id'];
        // Task counts
        $stmt2 = $conn->prepare("SELECT status, COUNT(*) AS cnt FROM tasks WHERE assigned_to = :staff_id GROUP BY status");
        $stmt2->bindParam(':staff_id', $staff_id, PDO::PARAM_INT);
        $stmt2->execute();
        $taskCounts = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $completed = 0;
        $ongoing = 0;
        $total = 0;
        foreach ($taskCounts as $t) {
            $total += $t['cnt'];
            if ($t['status'] === 'Completed') $completed = $t['cnt'];
            else if ($t['status'] === 'Ongoing') $ongoing = $t['cnt'];
        }
        // Overdue
        $stmt3 = $conn->prepare("SELECT COUNT(*) AS overdue_cnt FROM tasks WHERE assigned_to = :staff_id AND status != 'Completed' AND deadline < :today");
        $stmt3->bindParam(':staff_id', $staff_id, PDO::PARAM_INT);
        $stmt3->bindParam(':today', $today);
        $stmt3->execute();
        $overdue = $stmt3->fetchColumn();

        $results[] = [
            'staff' => $staff['name'],
            'total_tasks' => $total,
            'completed' => $completed,
            'ongoing' => $ongoing,
            'overdue' => $overdue,
            'completion_percent' => $total > 0 ? round(($completed / $total) * 100) : 0
        ];
    }
    echo json_encode($results);
} catch (PDOException $e) {
    echo json_encode([]);
}
