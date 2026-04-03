<?php
// ====================================================================
// ERROR HANDLER
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
    exit;
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// 1. ORG HEALTH — real-time snapshot of ALL active tasks right now
//    No date filter. This is the pulse of the whole organization.
// ====================================================================
$healthStmt = $conn->prepare("
    SELECT
        COUNT(DISTINCT t.id) AS total_active,

        SUM(CASE
            WHEN t.status = 'Completed' THEN 1 ELSE 0
        END) AS total_completed_alltime,

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
        END) AS overdue,

        SUM(CASE
            WHEN t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= CURDATE()
                AND t.completed_at  < CURDATE() + INTERVAL 1 DAY
            THEN 1 ELSE 0
        END) AS completed_today

    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
");
$healthStmt->execute();
$health = $healthStmt->fetch(PDO::FETCH_ASSOC);

$totalActive    = (int)($health['total_active']         ?? 0);
$ongoing        = (int)($health['ongoing']              ?? 0);
$overdue        = (int)($health['overdue']              ?? 0);
$completedToday = (int)($health['completed_today']      ?? 0);
$allCompleted   = (int)($health['total_completed_alltime'] ?? 0);

// Overall org completion rate across all tasks ever
$allTasks     = $conn->query("SELECT COUNT(*) AS c FROM tasks")->fetch()['c'];
$overallRate  = $allTasks > 0 ? round(($allCompleted / $allTasks) * 100) : 0;

// ====================================================================
// 2. OVERDUE TREND — last 4 weeks, one count per week
//    Shows whether overdue tasks are growing or shrinking over time.
// ====================================================================
$trendRows = [];
for ($i = 3; $i >= 0; $i--) {
    $weekEnd   = date('Y-m-d', strtotime("last sunday -{$i} weeks"));
    $weekStart = date('Y-m-d', strtotime($weekEnd . ' -6 days'));
    $label     = 'Wk ' . date('M j', strtotime($weekStart));

    $tStmt = $conn->prepare("
        SELECT COUNT(DISTINCT t.id) AS overdue_count
        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
        WHERE t.status NOT IN ('Completed')
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) BETWEEN ? AND ?
    ");
    $tStmt->execute([$weekStart, $weekEnd]);
    $trendRows[] = [
        'label'  => $label,
        'count'  => (int)$tStmt->fetch()['overdue_count'],
    ];
}

// ====================================================================
// 3. DEPARTMENTS AT RISK — ranked by overdue RATE, not raw count
//    Rate is fairer: a large dept with 2/20 overdue (10%) is healthier
//    than a small dept with 2/4 overdue (50%).
// ====================================================================
$riskStmt = $conn->prepare("
    SELECT
        d.id,
        d.name AS department,
        COUNT(DISTINCT t.id) AS total,
        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue

    FROM departments d
    INNER JOIN users u  ON u.department_id = d.id AND u.is_active = 1 AND u.role = 'staff'
    LEFT JOIN  tasks t  ON t.assigned_to = u.id

    GROUP BY d.id, d.name
    HAVING COUNT(DISTINCT t.id) > 0
    ORDER BY (
        SUM(CASE
            WHEN t.status NOT IN ('Completed')
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) / COUNT(DISTINCT t.id)
    ) DESC,
    SUM(CASE
        WHEN t.status NOT IN ('Completed')
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) < CURDATE()
        THEN 1 ELSE 0
    END) DESC
    LIMIT 5
");
$riskStmt->execute();
$riskRows = $riskStmt->fetchAll(PDO::FETCH_ASSOC);

$atRisk = array_map(function ($r) {
    $total   = (int)$r['total'];
    $overdue = (int)$r['overdue'];
    return [
        'department'   => $r['department'],
        'overdue'      => $overdue,
        'total'        => $total,
        'overdue_rate' => $total > 0 ? round(($overdue / $total) * 100) : 0,
    ];
}, $riskRows);

// ====================================================================
// 4. TOP PERFORMERS THIS MONTH — staff with most tasks completed
//    this calendar month, with their department name.
// ====================================================================
$monthStart = date('Y-m-01');
$monthEnd   = date('Y-m-t');

$topStmt = $conn->prepare("
    SELECT
        u.name,
        COALESCE(d.name, 'No Department') AS department,
        COUNT(t.id) AS completed_this_month

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    INNER JOIN tasks t ON t.assigned_to = u.id
        AND t.status = 'Completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= ?
        AND t.completed_at  < DATE_ADD(?, INTERVAL 1 DAY)

    WHERE u.role = 'staff' AND u.is_active = 1

    GROUP BY u.id, u.name, d.name
    ORDER BY completed_this_month DESC
    LIMIT 5
");
$topStmt->execute([$monthStart, $monthEnd]);
$topPerformers = $topStmt->fetchAll(PDO::FETCH_ASSOC);

$topPerformers = array_map(function ($p) {
    return [
        'name'                 => $p['name'],
        'department'           => $p['department'],
        'completed_this_month' => (int)$p['completed_this_month'],
    ];
}, $topPerformers);

// ====================================================================
// 5. REPORT SNAPSHOTS — headline numbers for each report period
//    Gives the president a one-line summary per period with a link.
// ====================================================================
function getPeriodCounts($conn, $start, $end) {
    $endPlus1 = date('Y-m-d', strtotime($end . ' +1 day'));
    $stmt = $conn->prepare("
        SELECT
            COUNT(DISTINCT t.id) AS total,
            SUM(CASE WHEN t.status = 'Completed' AND t.completed_at >= ? AND t.completed_at < ? THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < CURDATE() THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
        WHERE (
            (t.status = 'Completed' AND t.completed_at IS NOT NULL AND t.completed_at >= ? AND t.completed_at < ?)
            OR (t.deadline IS NOT NULL AND DATE(t.deadline) BETWEEN ? AND ?)
            OR (t.status NOT IN ('Completed') AND t.deadline IS NOT NULL AND DATE(t.deadline) < ?)
        )
    ");
    $stmt->execute([$start, $endPlus1, $start, $endPlus1, $start, $end, $start]);
    $r = $stmt->fetch(PDO::FETCH_ASSOC);
    return [
        'total'     => (int)($r['total']     ?? 0),
        'completed' => (int)($r['completed'] ?? 0),
        'overdue'   => (int)($r['overdue']   ?? 0),
    ];
}

$today      = date('Y-m-d');
$weekMon    = date('Y-m-d', strtotime('monday this week'));
$weekSun    = date('Y-m-d', strtotime('sunday this week'));
$q          = ceil(date('n') / 3);
$qStart     = date('Y-m-d', strtotime(date('Y') . '-' . (($q - 1) * 3 + 1) . '-01'));
$qEnd       = date('Y-m-d', strtotime(date('Y') . '-' . ($q * 3) . '-01 +1 month -1 day'));

$snapshots = [
    [
        'label' => 'Today',
        'sub'   => date('F j, Y'),
        'href'  => 'daily-reports.html',
        'data'  => getPeriodCounts($conn, $today, $today),
    ],
    [
        'label' => 'This Week',
        'sub'   => date('M j', strtotime($weekMon)) . ' – ' . date('M j', strtotime($weekSun)),
        'href'  => 'weekly-reports.html',
        'data'  => getPeriodCounts($conn, $weekMon, $weekSun),
    ],
    [
        'label' => 'This Month',
        'sub'   => date('F Y'),
        'href'  => 'monthly-reports.html',
        'data'  => getPeriodCounts($conn, $monthStart, $monthEnd),
    ],
    [
        'label' => 'This Quarter',
        'sub'   => 'Q' . $q . ' ' . date('Y'),
        'href'  => 'quarterly-reports.html',
        'data'  => getPeriodCounts($conn, $qStart, $qEnd),
    ],
    [
        'label' => 'This Year',
        'sub'   => date('Y'),
        'href'  => 'annual-reports.html',
        'data'  => getPeriodCounts($conn, date('Y-01-01'), date('Y-12-31')),
    ],
];

// ====================================================================
// RESPONSE
// ====================================================================
echo json_encode([
    'org_health' => [
        'total_active'    => $totalActive,
        'ongoing'         => $ongoing,
        'overdue'         => $overdue,
        'completed_today' => $completedToday,
        'overall_rate'    => $overallRate,
    ],
    'overdue_trend'   => $trendRows,
    'at_risk'         => $atRisk,
    'top_performers'  => $topPerformers,
    'snapshots'       => $snapshots,
    'month_label'     => date('F Y'),
]);