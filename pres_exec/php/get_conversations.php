<?php
declare(strict_types=1);
require_once __DIR__ . '/_auth.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

require_once '../../config/db.php';

$presencePath = '../../config/presence.php';
if (file_exists($presencePath)) {
    require_once $presencePath;
}

if (!function_exists('markUserActive')) {
    function markUserActive(PDO $conn, int $userId): void
    {
        $stmt = $conn->prepare("
            UPDATE users
            SET last_active_at = NOW()
            WHERE id = ?
            LIMIT 1
        ");
        $stmt->execute([$userId]);
    }
}

if (!function_exists('formatLastActiveLabel')) {
    function formatLastActiveLabel(?string $lastActiveAt): string
    {
        if (!$lastActiveAt) {
            return 'recently';
        }

        $last = strtotime($lastActiveAt);
        if ($last === false) {
            return 'recently';
        }

        $diff = time() - $last;

        if ($diff < 60) {
            return 'just now';
        }

        if ($diff < 3600) {
            $mins = (int) floor($diff / 60);
            return $mins . ' minute' . ($mins !== 1 ? 's' : '') . ' ago';
        }

        if ($diff < 86400) {
            $hours = (int) floor($diff / 3600);
            return $hours . ' hour' . ($hours !== 1 ? 's' : '') . ' ago';
        }

        $days = (int) floor($diff / 86400);
        return $days . ' day' . ($days !== 1 ? 's' : '') . ' ago';
    }
}

if (!function_exists('buildPresenceMeta')) {
    function buildPresenceMeta(?string $lastActiveAt, int $activeWindowSeconds = 120): array
    {
        if (!$lastActiveAt) {
            return [
                'is_active_now' => false,
                'last_active_at' => null,
                'last_active_label' => 'recently',
            ];
        }

        $last = strtotime($lastActiveAt);
        if ($last === false) {
            return [
                'is_active_now' => false,
                'last_active_at' => $lastActiveAt,
                'last_active_label' => 'recently',
            ];
        }

        $isActiveNow = (time() - $last) <= $activeWindowSeconds;

        return [
            'is_active_now' => $isActiveNow,
            'last_active_at' => $lastActiveAt,
            'last_active_label' => $isActiveNow ? 'now' : formatLastActiveLabel($lastActiveAt),
        ];
    }
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function getRoleLabel(string $role): string
{
    $role = strtolower(trim($role));

    return match ($role) {
        'admin' => 'Admin',
        'executive_director' => 'President',
        'president' => 'President',
        'supervisor' => 'Supervisor',
        'staff' => 'Staff',
        default => ucfirst($role ?: 'User'),
    };
}

function getInitials(string $name): string
{
    $name = trim($name);
    if ($name === '') {
        return 'U';
    }

    $parts = preg_split('/\s+/', $name) ?: [];
    $parts = array_values(array_filter($parts));

    if (!$parts) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials ?: 'U';
}

function getProfileImageUrl(?string $profileImage): string
{
    $profileImage = trim((string) $profileImage);

    if ($profileImage === '') {
        return '';
    }

    if (
        str_starts_with($profileImage, 'http://') ||
        str_starts_with($profileImage, 'https://') ||
        str_starts_with($profileImage, '/') ||
        str_starts_with($profileImage, './') ||
        str_starts_with($profileImage, '../')
    ) {
        return $profileImage;
    }

    return '../uploads/profiles/' . ltrim($profileImage, "/\\");
}

function getAllowedRolesForUser(string $currentRole): array
{
    $currentRole = strtolower(trim($currentRole));

    return match ($currentRole) {
        'admin', 'executive_director', 'president', 'supervisor', 'staff'
            => ['admin', 'executive_director', 'president', 'supervisor', 'staff'],
        default
            => ['admin', 'executive_director', 'president', 'supervisor', 'staff'],
    };
}

try {
    $currentUserId = (int) $_SESSION['user_id'];
    $currentUserRole = strtolower(trim((string) ($_SESSION['role'] ?? '')));

    markUserActive($conn, $currentUserId);

    $allowedRoles = getAllowedRolesForUser($currentUserRole);
    $rolePlaceholders = implode(',', array_fill(0, count($allowedRoles), '?'));

    $usersSql = "
        SELECT id, name, role, profile_image, last_active_at, is_active
        FROM users
        WHERE id <> ?
          AND is_active = 1
          AND role <> ''
          AND role IN ($rolePlaceholders)
        ORDER BY name ASC
    ";

    $usersStmt = $conn->prepare($usersSql);
    $usersStmt->execute([$currentUserId, ...$allowedRoles]);
    $users = $usersStmt->fetchAll(PDO::FETCH_ASSOC);

    $usersById = [];
    foreach ($users as $user) {
        $usersById[(int) $user['id']] = $user;
    }

    $messagesStmt = $conn->prepare("
        SELECT id, sender_id, recipient_id, message, time_sent, is_read
        FROM messages
        WHERE sender_id = ? OR recipient_id = ?
        ORDER BY time_sent DESC, id DESC
    ");
    $messagesStmt->execute([$currentUserId, $currentUserId]);
    $messages = $messagesStmt->fetchAll(PDO::FETCH_ASSOC);

    $conversationMap = [];
    $totalUnread = 0;

    foreach ($messages as $message) {
        $senderId = (int) $message['sender_id'];
        $recipientId = (int) $message['recipient_id'];
        $otherUserId = $senderId === $currentUserId ? $recipientId : $senderId;

        if (!isset($usersById[$otherUserId])) {
            continue;
        }

        if (!isset($conversationMap[$otherUserId])) {
            $partner = $usersById[$otherUserId];
            $presence = buildPresenceMeta($partner['last_active_at'] ?? null);

            $conversationMap[$otherUserId] = [
                'user_id'           => $otherUserId,
                'user_name'         => (string) $partner['name'],
                'user_role'         => (string) $partner['role'],
                'user_role_label'   => getRoleLabel((string) $partner['role']),
                'user_initials'     => getInitials((string) $partner['name']),
                'profile_image'     => $partner['profile_image'] ?? null,
                'profile_image_url' => getProfileImageUrl($partner['profile_image'] ?? null),
                'last_message'      => (string) ($message['message'] ?? ''),
                'last_time'         => $message['time_sent'] ?? null,
                'unread_count'      => 0,
                'has_conversation'  => true,
                'is_active_now'     => $presence['is_active_now'],
                'last_active_at'    => $presence['last_active_at'],
                'last_active_label' => $presence['last_active_label'],
            ];
        }

        $isIncomingUnread =
            $recipientId === $currentUserId &&
            $senderId !== $currentUserId &&
            (int) ($message['is_read'] ?? 0) === 0;

        if ($isIncomingUnread) {
            $conversationMap[$otherUserId]['unread_count']++;
            $totalUnread++;
        }
    }

    $conversations = array_values($conversationMap);

    usort($conversations, static function (array $a, array $b): int {
        $aTime = !empty($a['last_time']) ? strtotime((string) $a['last_time']) : 0;
        $bTime = !empty($b['last_time']) ? strtotime((string) $b['last_time']) : 0;
        return $bTime <=> $aTime;
    });

    $allUsers = [];
    foreach ($users as $user) {
        $userId = (int) $user['id'];
        $presence = buildPresenceMeta($user['last_active_at'] ?? null);

        $allUsers[] = [
            'id'                => $userId,
            'name'              => (string) $user['name'],
            'role'              => (string) $user['role'],
            'role_label'        => getRoleLabel((string) $user['role']),
            'initials'          => getInitials((string) $user['name']),
            'profile_image'     => $user['profile_image'] ?? null,
            'profile_image_url' => getProfileImageUrl($user['profile_image'] ?? null),
            'has_history'       => isset($conversationMap[$userId]),
            'is_active_now'     => $presence['is_active_now'],
            'last_active_at'    => $presence['last_active_at'],
            'last_active_label' => $presence['last_active_label'],
        ];
    }

    jsonResponse([
        'success'         => true,
        'current_user_id' => $currentUserId,
        'total_unread'    => $totalUnread,
        'conversations'   => $conversations,
        'all_users'       => $allUsers,
    ]);
} catch (Throwable $e) {
    error_log('get_conversations.php error: ' . $e->getMessage());

    jsonResponse([
        'error' => 'Failed to load conversations.',
        'debug' => $e->getMessage(),
    ], 500);
}