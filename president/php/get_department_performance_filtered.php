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

function getDeptDateRange($filter) {
    $today = date('Y-m-d');
    switch ($filter) {
        case 'daily':
            return [$today, $today, date('F j, Y')];
        case 'weekly':
            $start = date('Y-m-d', strtotime('monday this week'));
            $end   = date('Y-m-d', strtotime('sunday this week'));
            return [$start, $end, 'Week of ' . date('F j, Y', strtotime($start)) . ' – ' . date('F j, Y', strtotime($end))];
        case 'monthly':
            return [date('Y-m-01'), date('Y-m-t'), date('F Y')];
        case 'quarterly':
            $q     = ceil(date('n') / 3);
            $start = date('Y-m-d', strtotime(date('Y') . '-' . (($q - 1) * 3 + 1) . '-01'));
            $end   = date('Y-m-d', strtotime(date('Y') . '-' . ($q * 3) . '-01 +1 month -1 day'));
            return [$start, $end, 'Q' . $q . ' ' . date('Y')];
        case 'annually':
            return [date('Y-01-01'), date('Y-12-31'), date('Y')];
        default:
            return [$today, $today, date('F j, Y')];
    }
}

[$start, $end, $label] = getDeptDateRange($filter);
$endPlus1 = date('Y-m-d', strtotime($end . ' +1 day'));

// FIX 1: Was using created_at BETWEEN which counts tasks *created* in period,
// not tasks *relevant* to the period. Now uses the same relevance logic as
// all other report PHP files: completed within period, deadline in period,
// or already active before period started.
//
// FIX 2: Overdue derived from DATE(deadline) < CURDATE() instead of
// relying on the stored status = 'Overdue' which can be stale.
//
// FIX 3: Joins through users so only tasks assigned to active staff count.
// Uses t.assigned_to -> users -> department_id for consistency with reports.

$stmt = $conn->prepare("
    SELECT
        d.id AS department_id,
        d.name AS department,

        COUNT(DISTINCT t.id) AS total_tasks,

        SUM(CASE
            WHEN t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            THEN 1 ELSE 0
        END) AS completed,

        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) >= CURDATE()
            THEN 1 ELSE 0
        END) AS ongoing,

        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue

    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1 AND u.role = 'staff'
    LEFT JOIN tasks t ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at  < ?
            )
            OR (
                t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN ? AND ?
            )
            OR (
                t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?
            )
        )

    GROUP BY d.id, d.name
    ORDER BY overdue DESC, completed DESC, d.name ASC
");

$stmt->execute([
    $start, $endPlus1,
    $start, $endPlus1,
    $start, $end,
    $start,
]);

$departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($departments as &$dept) {
    $dept['department_id']      = (int)$dept['department_id'];
    $dept['total_tasks']        = (int)$dept['total_tasks'];
    $dept['completed']          = (int)$dept['completed'];
    $dept['ongoing']            = (int)$dept['ongoing'];
    $dept['overdue']            = (int)$dept['overdue'];
    $dept['completion_percent'] = $dept['total_tasks'] > 0
        ? round(($dept['completed'] / $dept['total_tasks']) * 100)
        : 0;
}
unset($dept);

echo json_encode([
    'departments' => $departments,
    'date_label'  => $label,
]);