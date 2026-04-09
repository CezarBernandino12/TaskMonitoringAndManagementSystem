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
session_start();

// ====================================================================
// AUTHENTICATION
// ====================================================================
$currentUserId = $_SESSION['user_id'] ?? null;
if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ====================================================================
// STEP 1 — Find all distinct users the current user has exchanged
//           messages with (either as sender or recipient).
// ====================================================================
$partnerStmt = $conn->prepare("
    SELECT DISTINCT
        CASE
            WHEN sender_id = ? THEN recipient_id
            ELSE sender_id
        END AS partner_id
    FROM messages
    WHERE sender_id = ? OR recipient_id = ?
");
$partnerStmt->execute([$currentUserId, $currentUserId, $currentUserId]);
$partnerIds = $partnerStmt->fetchAll(PDO::FETCH_COLUMN);
$partnerIds = array_map('intval', $partnerIds);

// ====================================================================
// STEP 2 — For each partner, fetch latest message + unread count.
// ====================================================================
$conversations = [];

if (!empty($partnerIds)) {
    $latestStmt = $conn->prepare("
        SELECT message, time_sent
        FROM messages
        WHERE (sender_id = ? AND recipient_id = ?)
           OR (sender_id = ? AND recipient_id = ?)
        ORDER BY time_sent DESC
        LIMIT 1
    ");

    $unreadStmt = $conn->prepare("
        SELECT COUNT(*) AS cnt
        FROM messages
        WHERE sender_id = ? AND recipient_id = ? AND is_read = 0
    ");

    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    $userStmt = $conn->prepare("
        SELECT id, name, role
        FROM users
        WHERE id IN ($placeholders) AND is_active = 1
    ");
    $userStmt->execute($partnerIds);
    $partners = $userStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($partners as $partner) {
        $pid = (int)$partner['id'];

        $latestStmt->execute([$currentUserId, $pid, $pid, $currentUserId]);
        $latest = $latestStmt->fetch(PDO::FETCH_ASSOC);

        $unreadStmt->execute([$pid, $currentUserId]);
        $unreadRow   = $unreadStmt->fetch(PDO::FETCH_ASSOC);
        $unreadCount = (int)($unreadRow['cnt'] ?? 0);

        $conversations[] = [
            'user_id'         => $pid,
            'user_name'       => $partner['name'],
            'user_role'       => $partner['role'],
            'last_message'    => $latest['message']   ?? null,
            'last_time'       => $latest['time_sent'] ?? null,
            'unread_count'    => $unreadCount,
        ];
    }

    // Sort by most recent message first
    usort($conversations, fn($a, $b) => strcmp($b['last_time'] ?? '', $a['last_time'] ?? ''));
}

// ====================================================================
// STEP 3 — All active users (excluding self), flagged with has_history
// ====================================================================
$usersStmt = $conn->prepare("
    SELECT id, name, role
    FROM users
    WHERE id != ? AND is_active = 1
    ORDER BY name ASC
");
$usersStmt->execute([$currentUserId]);
$allUsers = $usersStmt->fetchAll(PDO::FETCH_ASSOC);

$convoUserIds = array_column($conversations, 'user_id');

$formattedUsers = array_map(fn($u) => [
    'id'          => (int)$u['id'],
    'name'        => $u['name'],
    'role'        => $u['role'],
    'has_history' => in_array((int)$u['id'], $convoUserIds, true),
], $allUsers);

// ====================================================================
// STEP 4 — Total unread
// ====================================================================
$totalUnread = array_sum(array_column($conversations, 'unread_count'));

echo json_encode([
    'current_user_id' => (int)$currentUserId,
    'conversations'   => $conversations,
    'all_users'       => $formattedUsers,
    'total_unread'    => $totalUnread,
]);