<?php
require_once __DIR__ . '/_auth.php';
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
    echo json_encode([
        'error' => $e->getMessage(),
        'file'  => basename($e->getFile()),
        'line'  => $e->getLine()
    ]);
    exit;
});

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

// ====================================================================
// HELPERS
// ====================================================================
function getInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $parts = array_filter($parts);

    if (empty($parts)) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials ?: 'U';
}

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string)$profileImage);

    if ($profileImage === '') {
        return null;
    }

    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/');

    return $basePath . '/uploads/profiles/' . rawurlencode($profileImage);
}

function getPeriodCounts(PDO $conn, string $start, string $end): array
{
    $endPlus1 = date('Y-m-d', strtotime($end . ' +1 day'));

    $stmt = $conn->prepare("
        SELECT
            COUNT(DISTINCT t.id) AS total,

            SUM(CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at < ?
                THEN 1 ELSE 0
            END) AS completed,

            SUM(CASE
                WHEN t.status <> 'Completed'
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END) AS overdue

        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
        WHERE (
            (t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at < ?)
            OR
            (t.deadline IS NOT NULL
                AND DATE(t.deadline) BETWEEN ? AND ?)
            OR
            (t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?)
        )
    ");

    $stmt->execute([$start, $endPlus1, $start, $endPlus1, $start, $end, $start]);
    $r = $stmt->fetch(PDO::FETCH_ASSOC);

    return [
        'total'     => (int)($r['total'] ?? 0),
        'completed' => (int)($r['completed'] ?? 0),
        'overdue'   => (int)($r['overdue'] ?? 0)
    ];
}

// ====================================================================
// 1. ORG HEALTH — current live organization snapshot
// ====================================================================
$healthStmt = $conn->prepare("
    SELECT
        COUNT(DISTINCT t.id) AS total_active,

        SUM(CASE
            WHEN t.status = 'Completed' THEN 1 ELSE 0
        END) AS total_completed_alltime,

        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) >= CURDATE()
            THEN 1 ELSE 0
        END) AS ongoing,

        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue,

        SUM(CASE
            WHEN t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= CURDATE()
                AND t.completed_at < CURDATE() + INTERVAL 1 DAY
            THEN 1 ELSE 0
        END) AS completed_today

    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
");
$healthStmt->execute();
$health = $healthStmt->fetch(PDO::FETCH_ASSOC);

$totalActive    = (int)($health['total_active'] ?? 0);
$ongoing        = (int)($health['ongoing'] ?? 0);
$overdue        = (int)($health['overdue'] ?? 0);
$completedToday = (int)($health['completed_today'] ?? 0);
$allCompleted   = (int)($health['total_completed_alltime'] ?? 0);

$allTasksStmt = $conn->query("SELECT COUNT(*) AS c FROM tasks");
$allTasksRow = $allTasksStmt->fetch(PDO::FETCH_ASSOC);
$allTasks = (int)($allTasksRow['c'] ?? 0);

$overallRate = $allTasks > 0 ? round(($allCompleted / $allTasks) * 100) : 0;

// ====================================================================
// 2. TASK STATUS TREND — current week (Mon-Sat)
// ====================================================================
$taskStatusTrend = [
    'completed' => [],
    'ongoing'   => [],
    'overdue'   => []
];

$weekStart = date('Y-m-d', strtotime('monday this week'));

$trendStmt = $conn->prepare("
    SELECT
        SUM(CASE
            WHEN t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at < ?
            THEN 1 ELSE 0
        END) AS completed_count,

        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) >= ?
            THEN 1 ELSE 0
        END) AS ongoing_count,

        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < ?
            THEN 1 ELSE 0
        END) AS overdue_count

    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id AND u.is_active = 1
");

for ($i = 0; $i < 6; $i++) {
    $day = date('Y-m-d', strtotime($weekStart . " +{$i} days"));
    $nextDay = date('Y-m-d', strtotime($day . ' +1 day'));
    $label = date('D', strtotime($day));

    $trendStmt->execute([$day, $nextDay, $day, $day]);
    $row = $trendStmt->fetch(PDO::FETCH_ASSOC);

    $taskStatusTrend['completed'][] = [
        'label' => $label,
        'count' => (int)($row['completed_count'] ?? 0)
    ];

    $taskStatusTrend['ongoing'][] = [
        'label' => $label,
        'count' => (int)($row['ongoing_count'] ?? 0)
    ];

    $taskStatusTrend['overdue'][] = [
        'label' => $label,
        'count' => (int)($row['overdue_count'] ?? 0)
    ];
}

// ====================================================================
// 3. DEPARTMENTS AT RISK — ranked by overdue rate
// ====================================================================
$riskStmt = $conn->prepare("
    SELECT
        d.id,
        d.name AS department,
        COUNT(DISTINCT t.id) AS total,
        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) AS overdue

    FROM departments d
    INNER JOIN users u
        ON u.department_id = d.id
        AND u.is_active = 1
        AND u.role = 'staff'
    LEFT JOIN tasks t
        ON t.assigned_to = u.id

    GROUP BY d.id, d.name
    HAVING COUNT(DISTINCT t.id) > 0
    ORDER BY (
        SUM(CASE
            WHEN t.status <> 'Completed'
                AND t.deadline IS NOT NULL
                AND DATE(t.deadline) < CURDATE()
            THEN 1 ELSE 0
        END) / COUNT(DISTINCT t.id)
    ) DESC,
    SUM(CASE
        WHEN t.status <> 'Completed'
            AND t.deadline IS NOT NULL
            AND DATE(t.deadline) < CURDATE()
        THEN 1 ELSE 0
    END) DESC
    LIMIT 5
");
$riskStmt->execute();
$riskRows = $riskStmt->fetchAll(PDO::FETCH_ASSOC);

$atRisk = array_map(function ($r) {
    $total = (int)($r['total'] ?? 0);
    $overdueCount = (int)($r['overdue'] ?? 0);

    return [
        'department'   => $r['department'],
        'overdue'      => $overdueCount,
        'total'        => $total,
        'overdue_rate' => $total > 0 ? round(($overdueCount / $total) * 100) : 0
    ];
}, $riskRows);

// ====================================================================
// 4. TOP PERFORMERS THIS MONTH — now includes profile data
// ====================================================================
$monthStart = date('Y-m-01');
$monthEnd   = date('Y-m-t');
$monthEndPlus1 = date('Y-m-d', strtotime($monthEnd . ' +1 day'));

$topStmt = $conn->prepare("
    SELECT
        u.id,
        u.name,
        u.profile_image,
        COALESCE(d.name, 'No Department') AS department,
        COUNT(t.id) AS completed_this_month

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    INNER JOIN tasks t
        ON t.assigned_to = u.id
        AND t.status = 'Completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= ?
        AND t.completed_at < ?

    WHERE u.role = 'staff'
      AND u.is_active = 1

    GROUP BY u.id, u.name, u.profile_image, d.name
    ORDER BY completed_this_month DESC, u.name ASC
    LIMIT 8
");
$topStmt->execute([$monthStart, $monthEndPlus1]);
$topRows = $topStmt->fetchAll(PDO::FETCH_ASSOC);

$topPerformers = array_map(function ($p) {
    return [
        'id'                   => (int)($p['id'] ?? 0),
        'name'                 => $p['name'],
        'department'           => $p['department'],
        'completed_this_month' => (int)($p['completed_this_month'] ?? 0),
        'profile_image'        => $p['profile_image'] ?? null,
        'profile_image_url'    => getProfileImageUrl($p['profile_image'] ?? null),
        'initials'             => getInitials($p['name'] ?? '')
    ];
}, $topRows);

// ====================================================================
// 5. REPORT SNAPSHOTS
// ====================================================================
$today   = date('Y-m-d');
$weekMon = date('Y-m-d', strtotime('monday this week'));
$weekSun = date('Y-m-d', strtotime('sunday this week'));

$q = (int)ceil(date('n') / 3);
$qStartMonth = (($q - 1) * 3) + 1;
$qStart = date('Y-m-d', strtotime(date('Y') . '-' . $qStartMonth . '-01'));
$qEnd = date('Y-m-d', strtotime($qStart . ' +3 months -1 day'));

$yearStart = date('Y-01-01');
$yearEnd   = date('Y-12-31');

$snapshots = [
    [
        'label' => 'Today',
        'sub'   => date('F j, Y'),
        'href'  => 'daily-reports.html',
        'data'  => getPeriodCounts($conn, $today, $today)
    ],
    [
        'label' => 'This Week',
        'sub'   => date('M j', strtotime($weekMon)) . ' – ' . date('M j', strtotime($weekSun)),
        'href'  => 'weekly-reports.html',
        'data'  => getPeriodCounts($conn, $weekMon, $weekSun)
    ],
    [
        'label' => 'This Month',
        'sub'   => date('F Y'),
        'href'  => 'monthly-reports.html',
        'data'  => getPeriodCounts($conn, $monthStart, $monthEnd)
    ],
    [
        'label' => 'This Quarter',
        'sub'   => 'Q' . $q . ' ' . date('Y'),
        'href'  => 'quarterly-reports.html',
        'data'  => getPeriodCounts($conn, $qStart, $qEnd)
    ],
    [
        'label' => 'This Year',
        'sub'   => date('Y'),
        'href'  => 'annual-reports.html',
        'data'  => getPeriodCounts($conn, $yearStart, $yearEnd)
    ]
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
        'overall_rate'    => $overallRate
    ],
    'task_status_trend' => $taskStatusTrend,
    'overdue_trend'     => $taskStatusTrend['overdue'],
    'at_risk'           => $atRisk,
    'top_performers'    => $topPerformers,
    'snapshots'         => $snapshots,
    'month_label'       => date('F Y')
]);