<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }

    echo json_encode([
        'error' => 'Internal server error'
    ]);
    exit;
});

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

require_once '../../config/db.php';

function getInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $parts = array_values(array_filter($parts));

    if (empty($parts)) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= mb_strtoupper(mb_substr($part, 0, 1));
    }

    return $initials !== '' ? $initials : 'U';
}

function getRoleLabel(string $role): string
{
    $role = strtolower(trim($role));

    return match ($role) {
        'admin' => 'Administrator',
        'supervisor' => 'Supervisor',
        'staff' => 'Staff',
        'executive_director' => 'Executive Director',
        'president' => 'President',
        default => ucfirst($role !== '' ? $role : 'User'),
    };
}

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string) $profileImage);

    if ($profileImage === '') {
        return null;
    }

    return '../uploads/profiles/' . ltrim($profileImage, '/\\');
}

$currentUserId = (int) $_SESSION['user_id'];

$partnerStmt = $conn->prepare("
    SELECT DISTINCT
        CASE
            WHEN sender_id = :current_id THEN recipient_id
            ELSE sender_id
        END AS partner_id
    FROM messages
    WHERE sender_id = :current_id OR recipient_id = :current_id
");
$partnerStmt->execute([':current_id' => $currentUserId]);

$partnerIds = array_map('intval', $partnerStmt->fetchAll(PDO::FETCH_COLUMN));
$conversations = [];

if (!empty($partnerIds)) {
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));

    $userStmt = $conn->prepare("
        SELECT id, name, role, profile_image
        FROM users
        WHERE id IN ($placeholders)
          AND is_active = 1
    ");
    $userStmt->execute($partnerIds);
    $partners = $userStmt->fetchAll(PDO::FETCH_ASSOC);

    $latestStmt = $conn->prepare("
        SELECT message, time_sent
        FROM messages
        WHERE (sender_id = ? AND recipient_id = ?)
           OR (sender_id = ? AND recipient_id = ?)
        ORDER BY time_sent DESC, id DESC
        LIMIT 1
    ");

    $unreadStmt = $conn->prepare("
        SELECT COUNT(*) AS cnt
        FROM messages
        WHERE sender_id = ?
          AND recipient_id = ?
          AND is_read = 0
    ");

    foreach ($partners as $partner) {
        $partnerId = (int) $partner['id'];

        $latestStmt->execute([$currentUserId, $partnerId, $partnerId, $currentUserId]);
        $latest = $latestStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $unreadStmt->execute([$partnerId, $currentUserId]);
        $unreadRow = $unreadStmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $unreadCount = (int) ($unreadRow['cnt'] ?? 0);

        $conversations[] = [
            'user_id'           => $partnerId,
            'user_name'         => (string) $partner['name'],
            'user_role'         => (string) $partner['role'],
            'user_role_label'   => getRoleLabel((string) $partner['role']),
            'user_initials'     => getInitials((string) $partner['name']),
            'profile_image'     => $partner['profile_image'] ?? null,
            'profile_image_url' => getProfileImageUrl($partner['profile_image'] ?? null),
            'last_message'      => $latest['message'] ?? null,
            'last_time'         => $latest['time_sent'] ?? null,
            'unread_count'      => $unreadCount,
        ];
    }

    usort($conversations, function (array $a, array $b): int {
        return strcmp((string) ($b['last_time'] ?? ''), (string) ($a['last_time'] ?? ''));
    });
}

$usersStmt = $conn->prepare("
    SELECT id, name, role, profile_image
    FROM users
    WHERE id != ?
      AND is_active = 1
    ORDER BY name ASC
");
$usersStmt->execute([$currentUserId]);

$allUsers = $usersStmt->fetchAll(PDO::FETCH_ASSOC);
$convoUserIds = array_map('intval', array_column($conversations, 'user_id'));

$formattedUsers = array_map(function (array $u) use ($convoUserIds): array {
    $userId = (int) $u['id'];
    $name = (string) $u['name'];
    $role = (string) $u['role'];

    return [
        'id'                => $userId,
        'name'              => $name,
        'role'              => $role,
        'role_label'        => getRoleLabel($role),
        'initials'          => getInitials($name),
        'profile_image'     => $u['profile_image'] ?? null,
        'profile_image_url' => getProfileImageUrl($u['profile_image'] ?? null),
        'has_history'       => in_array($userId, $convoUserIds, true),
    ];
}, $allUsers);

$totalUnread = array_sum(array_map(
    fn(array $c): int => (int) ($c['unread_count'] ?? 0),
    $conversations
));

echo json_encode([
    'current_user_id' => $currentUserId,
    'conversations'   => $conversations,
    'all_users'       => $formattedUsers,
    'total_unread'    => $totalUnread,
], JSON_UNESCAPED_SLASHES);