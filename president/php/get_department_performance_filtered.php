<?php
require_once '../../config/db.php';

header('Content-Type: application/json');

function getDateRange($filter) {
    $today = date('Y-m-d');
    switch ($filter) {
        case 'daily':
            $start = $today;
            $end = $today;
            $label = date('F j, Y');
            break;
        case 'weekly':
            $start = date('Y-m-d', strtotime('monday this week'));
            $end = date('Y-m-d', strtotime('sunday this week'));
            $label = 'Week of ' . date('F j, Y', strtotime($start));
            break;
        case 'monthly':
            $start = date('Y-m-01');
            $end = date('Y-m-t');
            $label = date('F Y');
            break;
        case 'quarterly':
            $month = date('n');
            $quarter = ceil($month / 3);
            $start = date('Y-m-d', strtotime(date('Y') . '-' . ((($quarter-1)*3)+1) . '-01'));
            $end = date('Y-m-d', strtotime(date('Y') . '-' . ((($quarter)*3)) . '-01 +1 month -1 day'));
            $label = 'Q' . $quarter . ' ' . date('Y');
            break;
        case 'annually':
            $start = date('Y-01-01');
            $end = date('Y-12-31');
            $label = date('Y');
            break;
        default:
            $start = $today;
            $end = $today;
            $label = date('F j, Y');
    }
    return [$start, $end, $label];
}

$filter = isset($_GET['filter']) ? $_GET['filter'] : 'monthly';
list($start, $end, $label) = getDateRange($filter);

try {
    $stmt = $conn->prepare("SELECT d.name as department, COUNT(t.id) as total_tasks, 
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status = 'Ongoing' THEN 1 ELSE 0 END) as ongoing,
        SUM(CASE WHEN t.status = 'Overdue' THEN 1 ELSE 0 END) as overdue
        FROM departments d
        LEFT JOIN tasks t ON t.department_id = d.id AND t.created_at BETWEEN :start AND :end
        GROUP BY d.id");
    $stmt->execute(['start' => $start, 'end' => $end]);
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($departments as &$dept) {
        $dept['completion_percent'] = $dept['total_tasks'] > 0 ? round(($dept['completed'] / $dept['total_tasks']) * 100) : 0;
    }
    echo json_encode(['departments' => $departments, 'date_label' => $label]);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}
