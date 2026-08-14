<?php
require_once __DIR__ . '/_auth.php';
require_once '../../config/db.php';

header('Content-Type: application/json');

try {
    $stmt = $conn->query("SELECT d.name as department, COUNT(t.id) as total_tasks, 
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status = 'Ongoing' THEN 1 ELSE 0 END) as ongoing,
        SUM(CASE WHEN t.status = 'Overdue' THEN 1 ELSE 0 END) as overdue
        FROM departments d
        LEFT JOIN tasks t ON t.department_id = d.id
        GROUP BY d.id");
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Calculate completion %
    foreach ($departments as &$dept) {
        $dept['completion_percent'] = $dept['total_tasks'] > 0 ? round(($dept['completed'] / $dept['total_tasks']) * 100) : 0;
    }
    echo json_encode($departments);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}
