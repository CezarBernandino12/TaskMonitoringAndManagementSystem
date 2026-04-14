<?php
// ====================================================================
// get_activity_logs.php  –  Admin: paginated + filtered activity log
//
// GET params (all optional):
//   page        int    page number, 1-based          default: 1
//   per_page    int    rows per page (max 100)        default: 25
//   action      str    exact action filter            default: ''
//   target_type str    target type filter             default: ''
//   user_id     int    filter by actor                default: 0
//   search      str    free-text search on desc/name  default: ''
//   date_from   str    YYYY-MM-DD                     default: ''
//   date_to     str    YYYY-MM-DD                     default: ''
//
// Returns:
//   { logs: [...], total: int, page: int, per_page: int, pages: int }
// ====================================================================
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

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ---- Input sanitisation ------------------------------------------------
$page       = max(1, (int)($_GET['page']        ?? 1));
$perPage    = min(100, max(1, (int)($_GET['per_page']   ?? 25)));
$action     = trim($_GET['action']      ?? '');
$targetType = trim($_GET['target_type'] ?? '');
$userId     = (int)($_GET['user_id']    ?? 0);
$search     = trim($_GET['search']      ?? '');
$dateFrom   = trim($_GET['date_from']   ?? '');
$dateTo     = trim($_GET['date_to']     ?? '');

// ---- Build dynamic WHERE -----------------------------------------------
$where  = ['1=1'];
$params = [];

if ($action !== '') {
    $where[]  = 'al.action = ?';
    $params[] = $action;
}
if ($targetType !== '') {
    $where[]  = 'al.target_type = ?';
    $params[] = $targetType;
}
if ($userId > 0) {
    $where[]  = 'al.user_id = ?';
    $params[] = $userId;
}
if ($search !== '') {
    $where[]  = '(al.user_name LIKE ? OR al.description LIKE ?)';
    $like     = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
}
if ($dateFrom !== '') {
    $where[]  = 'DATE(al.created_at) >= ?';
    $params[] = $dateFrom;
}
if ($dateTo !== '') {
    $where[]  = 'DATE(al.created_at) <= ?';
    $params[] = $dateTo;
}

$whereSQL = implode(' AND ', $where);

// ---- Count total matching rows -----------------------------------------
$countStmt = $conn->prepare("SELECT COUNT(*) FROM activity_logs al WHERE $whereSQL");
$countStmt->execute($params);
$total  = (int)$countStmt->fetchColumn();
$pages  = $total > 0 ? (int)ceil($total / $perPage) : 1;
$offset = ($page - 1) * $perPage;

// ---- Fetch page of logs ------------------------------------------------
$logStmt = $conn->prepare("
    SELECT al.id, al.user_id, al.user_name, al.role,
           al.action, al.target_type, al.target_id,
           al.description, al.created_at
    FROM   activity_logs al
    WHERE  $whereSQL
    ORDER  BY al.created_at DESC
    LIMIT  $perPage OFFSET $offset
");
$logStmt->execute($params);
$rows = $logStmt->fetchAll(PDO::FETCH_ASSOC);

$logs = array_map(function ($r) {
    return [
        'id'          => (int)$r['id'],
        'user_id'     => (int)$r['user_id'],
        'user_name'   => $r['user_name'],
        'role'        => $r['role'],
        'action'      => $r['action'],
        'target_type' => $r['target_type'],
        'target_id'   => $r['target_id'] ? (int)$r['target_id'] : null,
        'description' => $r['description'],
        'created_at'  => $r['created_at'],
    ];
}, $rows);

// ---- Distinct action list for filter dropdown --------------------------
$actionsStmt = $conn->query("SELECT DISTINCT action FROM activity_logs ORDER BY action ASC");
$actionList  = $actionsStmt->fetchAll(PDO::FETCH_COLUMN);

echo json_encode([
    'logs'     => $logs,
    'total'    => $total,
    'page'     => $page,
    'per_page' => $perPage,
    'pages'    => $pages,
    'actions'  => $actionList,
]);
