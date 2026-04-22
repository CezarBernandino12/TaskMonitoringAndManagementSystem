<?php
/**
 * staff/php/mark_notification_read.php
 *
 * POST  { "keys": ["task-42-task_overdue", ...] }
 * Marks the supplied notification keys as read for the current user.
 */

date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../../config/db.php';
require_once '../../config/notifications.php';

header('Content-Type: application/json; charset=UTF-8');

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

$input = json_decode(file_get_contents('php://input'), true);
$rawKeys = $input['keys'] ?? [];

if (!is_array($rawKeys) || empty($rawKeys)) {
    echo json_encode(['success' => false, 'error' => 'No keys provided']);
    exit();
}

// Allow only safe characters in notification keys.
$keys = array_values(array_filter(
    array_map(
        static fn($k) => preg_replace('/[^a-zA-Z0-9\-_]/', '', (string) $k),
        $rawKeys
    ),
    static fn($k) => $k !== ''
));

if (empty($keys)) {
    echo json_encode(['success' => false, 'error' => 'Invalid keys']);
    exit();
}

try {
    markKeysRead($conn, (int) $_SESSION['user_id'], $keys);

    // Probabilistic cleanup: prune reads older than 30 days on ~5% of requests.
    // Keeps the table lean without needing a cron job.
    if (random_int(1, 20) === 1) {
        pruneOldReads($conn, 30);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false]);
}
