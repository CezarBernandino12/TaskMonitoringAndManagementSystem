<?php
/**
 * admin/php/create_announcement.php
 *
 * POST  { "title": "...", "body": "...", "roles": ["staff","supervisor"] }
 *
 * Creates an announcement notification for every active user whose role
 * is in the supplied list. Only admin users can call this endpoint.
 *
 * Response: { "success": true, "recipients_count": N }
 *           { "success": false, "error": "..." }
 */

date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../../config/db.php';
require_once '../../config/notifications.php';

header('Content-Type: application/json; charset=UTF-8');

// ── Authentication & authorisation ────────────────────────────────────────────
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthenticated']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Verify the caller is an admin.
$callerStmt = $conn->prepare("SELECT role FROM users WHERE id = :id LIMIT 1");
$callerStmt->bindValue(':id', (int) $_SESSION['user_id'], PDO::PARAM_INT);
$callerStmt->execute();
$caller = $callerStmt->fetch(PDO::FETCH_ASSOC);

if (!$caller || $caller['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit();
}

// ── Input validation ──────────────────────────────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit();
}

$title = trim($input['title'] ?? '');
$body  = trim($input['body']  ?? '');
$roles = $input['roles'] ?? [];

if ($title === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Title is required']);
    exit();
}

if (mb_strlen($title) > 255) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Title exceeds 255 characters']);
    exit();
}

if (!is_array($roles) || empty($roles)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'At least one role must be selected']);
    exit();
}

// Allow only known roles to prevent mass enumeration.
$allowedRoles = ['admin', 'supervisor', 'staff', 'president', 'executive_director'];
$roles = array_values(
    array_filter(
        array_map('strval', $roles),
        static fn($r) => in_array($r, $allowedRoles, true)
    )
);

if (empty($roles)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No valid roles provided']);
    exit();
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
try {
    $count = dispatchAnnouncementToRoles(
        $conn,
        (int) $_SESSION['user_id'],
        $roles,
        $title,
        $body
    );

    echo json_encode([
        'success'          => true,
        'recipients_count' => $count,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send announcement']);
}
