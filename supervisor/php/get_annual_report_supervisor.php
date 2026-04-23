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
    echo json_encode([
        'error' => $e->getMessage(),
        'file'  => basename($e->getFile()),
        'line'  => $e->getLine(),
    ]);
    exit;
});

// ====================================================================
// BOOTSTRAP
// ====================================================================
require '../../config/db.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string)$profileImage);
    if ($profileImage === '') return null;
    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/');
    return $basePath . '/uploads/profiles/' . rawurlencode($profileImage);
}

// ====================================================================
// AUTH — supervisor must be logged in
// ====================================================================
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit;
}

$supervisorId = (int)$_SESSION['user_id'];

// Fetch the supervisor's department_id, role, and department name
$supStmt = $conn->prepare("
    SELECT u.department_id, u.role, d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ? AND u.is_active = 1
    LIMIT 1
");
$supStmt->execute([$supervisorId]);
$supervisor = $supStmt->fetch(PDO::FETCH_ASSOC);

if (!$supervisor) {
    http_response_code(403);
    echo json_encode(['error' => 'Supervisor account not found or inactive.']);
    exit;
}

if (!in_array($supervisor['role'], ['supervisor', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Supervisor role required.']);
    exit;
}

if (empty($supervisor['department_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Supervisor is not assigned to any department.']);
    exit;
}

$supervisorDeptId   = (int)$supervisor['department_id'];
$supervisorDeptName = $supervisor['department_name'];

// ====================================================================
// INPUT VALIDATION
// ====================================================================
$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

if ($year < 2000 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year. Must be between 2000 and 2100.']);
    exit;
}

// NOTE: No department filter from $_GET — scope is always the supervisor's own dept.

$yearStart    = "$year-01-01";
$yearEnd      = "$year-12-31";
$yearEndPlus1 = "$year-12-31 23:59:59"; // inclusive upper bound for completed_at

// ====================================================================
// STATUS LOGIC (same rules used across all report files)
// ====================================================================
// COMPLETED : status = 'Completed' AND completed_at falls within [yearStart, yearEnd]
// ONGOING   : status NOT IN ('Completed') AND DATE(deadline) >= CURDATE()
// OVERDUE   : status NOT IN ('Completed') AND DATE(deadline) < CURDATE()
// RELEVANT  : completed_at in year OR deadline in year OR
//             still active/overdue with deadline before year end
// ====================================================================


// ====================================================================
// 1. OVERALL SUMMARY
// ====================================================================
$summarySql = "
    SELECT
        COUNT(DISTINCT t.id) AS total,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at <= ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM tasks t
    INNER JOIN users u ON t.assigned_to = u.id
    WHERE u.is_active = 1
    AND u.role = 'staff'
    AND u.department_id = ?
    AND (
        (
            t.status = 'Completed'
            AND t.completed_at IS NOT NULL
            AND t.completed_at >= ?
            AND t.completed_at <= ?
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
";

$summaryStmt = $conn->prepare($summarySql);
$summaryStmt->execute([
    $yearStart, $yearEndPlus1,
    $supervisorDeptId,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
]);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


// ====================================================================
// 2. DEPARTMENT BREAKDOWN
// Always a single row for the supervisor's department.
// Keeps the same array shape so the frontend chart code is unchanged.
// ====================================================================
$deptSql = "
    SELECT
        d.id   AS department_id,
        d.name AS department,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at <= ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue,

        COUNT(DISTINCT t.id) AS total

    FROM departments d
    INNER JOIN users u  ON u.department_id = d.id
                       AND u.is_active = 1
                       AND u.role = 'staff'
    LEFT  JOIN tasks t  ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at <= ?
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

    WHERE d.id = ?

    GROUP BY d.id, d.name
";

$deptStmt = $conn->prepare($deptSql);
$deptStmt->execute([
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
    $supervisorDeptId,
]);
$deptRows = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

$departments = array_map(function ($d) {
    $total = (int)$d['total'];
    $comp  = (int)$d['completed'];
    $rate  = $total > 0 ? round(($comp / $total) * 100) : 0;
    return [
        'department_id'   => (int)$d['department_id'],
        'department'      => $d['department'],
        'completed'       => $comp,
        'ongoing'         => (int)$d['ongoing'],
        'overdue'         => (int)$d['overdue'],
        'total'           => $total,
        'completion_rate' => $rate,
    ];
}, $deptRows);


// ====================================================================
// 3. QUARTERLY TREND
// Four quarters, each scoped to supervisor's department.
// ====================================================================
$quarters = [
    1 => ['start' => "$year-01-01", 'end' => "$year-03-31", 'label' => 'Q1 (Jan–Mar)', 'range' => 'Jan – Mar'],
    2 => ['start' => "$year-04-01", 'end' => "$year-06-30", 'label' => 'Q2 (Apr–Jun)', 'range' => 'Apr – Jun'],
    3 => ['start' => "$year-07-01", 'end' => "$year-09-30", 'label' => 'Q3 (Jul–Sep)', 'range' => 'Jul – Sep'],
    4 => ['start' => "$year-10-01", 'end' => "$year-12-31", 'label' => 'Q4 (Oct–Dec)', 'range' => 'Oct – Dec'],
];

$quarterlyTrend = [];

foreach ($quarters as $qNum => $q) {
    $qEndPlus1 = date('Y-m-d', strtotime($q['end'] . ' +1 day'));

    $qSql = "
        SELECT
            SUM(
                CASE
                    WHEN t.status = 'Completed'
                        AND t.completed_at IS NOT NULL
                        AND t.completed_at >= ?
                        AND t.completed_at < ?
                    THEN 1 ELSE 0
                END
            ) AS completed,

            SUM(
                CASE
                    WHEN t.status NOT IN ('Completed')
                        AND t.deadline IS NOT NULL
                        AND DATE(t.deadline) >= CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS ongoing,

            SUM(
                CASE
                    WHEN t.status NOT IN ('Completed')
                        AND t.deadline IS NOT NULL
                        AND DATE(t.deadline) < CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS overdue,

            COUNT(DISTINCT t.id) AS total

        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id
        WHERE u.is_active = 1
        AND u.role = 'staff'
        AND u.department_id = ?
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at < ?
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
    ";

    $qStmt = $conn->prepare($qSql);
    $qStmt->execute([
        $q['start'], $qEndPlus1,
        $supervisorDeptId,
        $q['start'], $qEndPlus1,
        $q['start'], $q['end'],
        $q['start'],
    ]);
    $row = $qStmt->fetch(PDO::FETCH_ASSOC);

    $completed = (int)($row['completed'] ?? 0);
    $ongoing   = (int)($row['ongoing']   ?? 0);
    $overdue   = (int)($row['overdue']   ?? 0);
    $total     = (int)($row['total']     ?? 0);

    $quarterlyTrend[] = [
        'quarter'         => $qNum,
        'quarter_label'   => $q['label'],
        'quarter_range'   => $q['range'],
        'completed'       => $completed,
        'ongoing'         => $ongoing,
        'overdue'         => $overdue,
        'total'           => $total,
        'completion_rate' => $total > 0 ? round(($completed / $total) * 100) : 0,
    ];
}


// ====================================================================
// 4. MONTHLY TREND — all 12 months
// Used for the line chart showing year-long momentum.
// ====================================================================
$monthNames = [
    1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
    5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
    9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec',
];

$monthlyTrend = [];

for ($m = 1; $m <= 12; $m++) {
    $mStart    = sprintf('%04d-%02d-01', $year, $m);
    $daysInM   = (int)date('t', strtotime($mStart));
    $mEnd      = sprintf('%04d-%02d-%02d', $year, $m, $daysInM);
    $mEndPlus1 = date('Y-m-d', strtotime($mEnd . ' +1 day'));

    $mSql = "
        SELECT
            SUM(
                CASE
                    WHEN t.status = 'Completed'
                        AND t.completed_at IS NOT NULL
                        AND t.completed_at >= ?
                        AND t.completed_at < ?
                    THEN 1 ELSE 0
                END
            ) AS completed,

            SUM(
                CASE
                    WHEN t.status NOT IN ('Completed')
                        AND t.deadline IS NOT NULL
                        AND DATE(t.deadline) >= CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS ongoing,

            SUM(
                CASE
                    WHEN t.status NOT IN ('Completed')
                        AND t.deadline IS NOT NULL
                        AND DATE(t.deadline) < CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS overdue

        FROM tasks t
        INNER JOIN users u ON t.assigned_to = u.id
        WHERE u.is_active = 1
        AND u.role = 'staff'
        AND u.department_id = ?
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at < ?
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
    ";

    $mStmt = $conn->prepare($mSql);
    $mStmt->execute([
        $mStart, $mEndPlus1,
        $supervisorDeptId,
        $mStart, $mEndPlus1,
        $mStart, $mEnd,
        $mStart,
    ]);
    $row = $mStmt->fetch(PDO::FETCH_ASSOC);

    $monthlyTrend[] = [
        'month'      => $m,
        'month_name' => $monthNames[$m],
        'completed'  => (int)($row['completed'] ?? 0),
        'ongoing'    => (int)($row['ongoing']   ?? 0),
        'overdue'    => (int)($row['overdue']   ?? 0),
    ];
}


// ====================================================================
// 5. EMPLOYEE BREAKDOWN — only staff in the supervisor's department
// ====================================================================
$employeeSql = "
    SELECT
        u.id,
        u.name,
        u.profile_image,
        COALESCE(d.name, 'No Department') AS department,

        SUM(
            CASE
                WHEN t.status = 'Completed'
                    AND t.completed_at IS NOT NULL
                    AND t.completed_at >= ?
                    AND t.completed_at <= ?
                THEN 1 ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) >= CURDATE()
                THEN 1 ELSE 0
            END
        ) AS ongoing,

        SUM(
            CASE
                WHEN t.status NOT IN ('Completed')
                    AND t.deadline IS NOT NULL
                    AND DATE(t.deadline) < CURDATE()
                THEN 1 ELSE 0
            END
        ) AS overdue

    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN tasks t ON t.assigned_to = u.id
        AND (
            (
                t.status = 'Completed'
                AND t.completed_at IS NOT NULL
                AND t.completed_at >= ?
                AND t.completed_at <= ?
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

    WHERE u.role = 'staff'
    AND u.is_active = 1
    AND u.department_id = ?

    GROUP BY u.id, u.name, u.profile_image, d.name
    ORDER BY completed DESC, overdue ASC, u.name ASC
";

$empStmt = $conn->prepare($employeeSql);
$empStmt->execute([
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEndPlus1,
    $yearStart, $yearEnd,
    $yearStart,
    $supervisorDeptId,
]);
$empRows = $empStmt->fetchAll(PDO::FETCH_ASSOC);

$employees = array_values(array_filter(array_map(function ($e) {
    $completed = (int)($e['completed'] ?? 0);
    $ongoing   = (int)($e['ongoing']   ?? 0);
    $overdue   = (int)($e['overdue']   ?? 0);
    $total     = $completed + $ongoing + $overdue;
    if ($total === 0) return null;
    return [
        'id'                => (int)$e['id'],
        'name'              => $e['name'],
        'department'        => $e['department'],
        'profile_image_url' => getProfileImageUrl($e['profile_image'] ?? null),
        'completed'         => $completed,
        'ongoing'           => $ongoing,
        'overdue'           => $overdue,
        'total'             => $total,
        'completion_rate'   => $total > 0 ? round(($completed / $total) * 100) : 0,
    ];
}, $empRows)));


// ====================================================================
// 6. RESPONSE
// ====================================================================
echo json_encode([
    'year'     => $year,
    'year_start' => $yearStart,
    'year_end'   => $yearEnd,

    // Supervisor context — used by the frontend to display the dept name
    'supervisor_department_id'   => $supervisorDeptId,
    'supervisor_department_name' => $supervisorDeptName,

    'summary' => [
        'total'     => (int)($summary['total']     ?? 0),
        'completed' => (int)($summary['completed'] ?? 0),
        'ongoing'   => (int)($summary['ongoing']   ?? 0),
        'overdue'   => (int)($summary['overdue']   ?? 0),
    ],

    // { department_id, department, completed, ongoing, overdue, total, completion_rate }
    'departments'     => $departments,

    // { quarter, quarter_label, quarter_range, completed, ongoing, overdue, total, completion_rate }
    'quarterly_trend' => $quarterlyTrend,

    // { month, month_name, completed, ongoing, overdue }
    'monthly_trend'   => $monthlyTrend,

    // { id, name, department, completed, ongoing, overdue, total, completion_rate }
    'employees'       => $employees,
]);
