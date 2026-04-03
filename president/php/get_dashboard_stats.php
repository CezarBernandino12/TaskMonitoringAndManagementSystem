<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

$filter = $_GET['filter'] ?? 'monthly';

function getDashboardDateRange($filter) {
    $today = date('Y-m-d');
    switch ($filter) {
        case 'daily':
            return [$today, $today];
        case 'weekly':
            $start = date('Y-m-d', strtotime('monday this week'));
            $end   = date('Y-m-d', strtotime('sunday this week'));
            return [$start, $end];
        case 'monthly':
            return [date('Y-m-01'), date('Y-m-t')];
        case 'quarterly':
            $q     = ceil(date('n') / 3);
            $start = date('Y-m-d', strtotime(date('Y') . '-' . (($q - 1) * 3 + 1) . '-01'));
            $end   = date('Y-m-d', strtotime(date('Y') . '-' . ($q * 3) . '-01 +1 month -1 day'));
            return [$start, $end];
        case 'annually':
            return [date('Y-01-01'), date('Y-12-31')];
        default:
            return [$today, $today];
    }
}

[$start, $end] = getDashboardDateRange($filter);
$endPlus1 = date('Y-m-d', strtotime($end . ' +1 day'));

$stmt = $conn->prepare("
    SELECT
        COUNT(DISTINCT t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ? THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) >= CURDATE() THEN 1 ELSE 0 END) AS ongoing_tasks,
        SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 1 ELSE 0 END) AS overdue_tasks
    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
    WHERE (
        (t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ?)
        OR (t.deadline IS NOT NULL AND DATE(t.deadline) BETWEEN ? AND ?)
        OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < ?)
    )
");
$stmt->execute([$start, $endPlus1, $start, $endPlus1, $start, $end, $start]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

$totalTasks     = (int)($row['total_tasks']     ?? 0);
$completedTasks = (int)($row['completed_tasks'] ?? 0);
$ongoingTasks   = (int)($row['ongoing_tasks']   ?? 0);
$overdueTasks   = (int)($row['overdue_tasks']   ?? 0);

$deptStmt   = $conn->query("SELECT COUNT(*) AS count FROM departments");
$totalDepts = (int)$deptStmt->fetch(PDO::FETCH_ASSOC)['count'];

$completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) . '%' : '0%';

echo json_encode([
    'total_departments' => $totalDepts,
    'total_tasks'       => $totalTasks,
    'completed_tasks'   => $completedTasks,
    'ongoing_tasks'     => $ongoingTasks,
    'overdue_tasks'     => $overdueTasks,
    'completion_rate'   => $completionRate,
]);