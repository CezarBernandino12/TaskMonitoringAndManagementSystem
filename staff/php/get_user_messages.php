<?php
declare(strict_types=1);

session_start();
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
        str_starts_with($profileImage, '../') ||
        str_starts_with($profileImage, 'uploads/')
    ) {
        return $profileImage;
    }

    return 'uploads/profile_images/' . $profileImage;
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
    $otherUserId = isset($_GET['other_user_id']) ? (int) $_GET['other_user_id'] : 0;

    if ($otherUserId <= 0) {
        jsonResponse(['error' => 'Invalid user.'], 422);
    }

    if ($otherUserId === $currentUserId) {
        jsonResponse(['error' => 'Cannot open a thread with yourself.'], 422);
    }

    markUserActive($conn, $currentUserId);

    $allowedRoles = getAllowedRolesForUser($currentUserRole);
    $rolePlaceholders = implode(',', array_fill(0, count($allowedRoles), '?'));

    $userSql = "
        SELECT id, name, role, profile_image, last_active_at, is_active
        FROM users
        WHERE id = ?
          AND is_active = 1
          AND role <> ''
          AND role IN ($rolePlaceholders)
        LIMIT 1
    ";

    $userStmt = $conn->prepare($userSql);
    $userStmt->execute([$otherUserId, ...$allowedRoles]);
    $otherUser = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$otherUser) {
        jsonResponse(['error' => 'User not found or not allowed.'], 404);
    }

    $markReadStmt = $conn->prepare("
        UPDATE messages
        SET is_read = 1,
            read_at = NOW()
        WHERE sender_id = ?
          AND recipient_id = ?
          AND is_read = 0
    ");
    $markReadStmt->execute([$otherUserId, $currentUserId]);

    $messagesStmt = $conn->prepare("
        SELECT
            tm.id,
            tm.sender_id,
            tm.recipient_id,
            tm.message,
            tm.task_id,
            tm.time_sent,
            tm.is_read,
            tm.read_at,
            sender.name AS sender_name,
            sender.profile_image AS sender_profile_image,
            recipient.name AS recipient_name,
            recipient.profile_image AS recipient_profile_image
        FROM messages tm
        INNER JOIN users sender ON sender.id = tm.sender_id
        INNER JOIN users recipient ON recipient.id = tm.recipient_id
        WHERE
            (tm.sender_id = ? AND tm.recipient_id = ?)
            OR
            (tm.sender_id = ? AND tm.recipient_id = ?)
        ORDER BY tm.time_sent ASC, tm.id ASC
    ");
    $messagesStmt->execute([$currentUserId, $otherUserId, $otherUserId, $currentUserId]);
    $rows = $messagesStmt->fetchAll(PDO::FETCH_ASSOC);

    $messageIds = array_map(
        static fn(array $row): int => (int) $row['id'],
        $rows
    );

    $attachmentsByMessageId = [];

    if ($messageIds) {
        $attachmentPlaceholders = implode(',', array_fill(0, count($messageIds), '?'));

        $attachmentsStmt = $conn->prepare("
            SELECT id, message_id, file_name, file_path
            FROM message_attachments
            WHERE message_id IN ($attachmentPlaceholders)
            ORDER BY id ASC
        ");
        $attachmentsStmt->execute($messageIds);

        while ($attachment = $attachmentsStmt->fetch(PDO::FETCH_ASSOC)) {
            $messageId = (int) $attachment['message_id'];

            $attachmentsByMessageId[$messageId][] = [
                'id'        => (int) $attachment['id'],
                'file_name' => (string) ($attachment['file_name'] ?? ''),
                'file_path' => (string) ($attachment['file_path'] ?? ''),
            ];
        }
    }

    $messages = [];
    foreach ($rows as $row) {
        $messageId = (int) $row['id'];

        $messages[] = [
            'id'                          => $messageId,
            'sender_id'                   => (int) $row['sender_id'],
            'recipient_id'                => (int) $row['recipient_id'],
            'task_id'                     => $row['task_id'] !== null ? (int) $row['task_id'] : null,
            'sender_name'                 => (string) $row['sender_name'],
            'recipient_name'              => (string) $row['recipient_name'],
            'sender_profile_image_url'    => getProfileImageUrl($row['sender_profile_image'] ?? null),
            'recipient_profile_image_url' => getProfileImageUrl($row['recipient_profile_image'] ?? null),
            'message'                     => (string) ($row['message'] ?? ''),
            'time_sent'                   => $row['time_sent'] ?? null,
            'is_read'                     => (int) ($row['is_read'] ?? 0) === 1,
            'read_at'                     => $row['read_at'] ?? null,
            'attachments'                 => $attachmentsByMessageId[$messageId] ?? [],
        ];
    }

    $presence = buildPresenceMeta($otherUser['last_active_at'] ?? null);

    jsonResponse([
        'success' => true,
        'other_user' => [
            'id'                => (int) $otherUser['id'],
            'name'              => (string) $otherUser['name'],
            'role'              => (string) $otherUser['role'],
            'role_label'        => getRoleLabel((string) $otherUser['role']),
            'initials'          => getInitials((string) $otherUser['name']),
            'profile_image'     => $otherUser['profile_image'] ?? null,
            'profile_image_url' => getProfileImageUrl($otherUser['profile_image'] ?? null),
            'is_active_now'     => $presence['is_active_now'],
            'last_active_at'    => $presence['last_active_at'],
            'last_active_label' => $presence['last_active_label'],
        ],
        'messages' => $messages,
    ]);
} catch (Throwable $e) {
    error_log('staff/get_user_messages.php error: ' . $e->getMessage());

    jsonResponse([
        'error' => 'Failed to load messages.',
        'debug' => $e->getMessage(),
    ], 500);
}