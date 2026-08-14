<?php
declare(strict_types=1);
require_once __DIR__ . '/_auth.php';

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

header('Content-Type: application/json; charset=utf-8');

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
$taskId = $_GET['task_id'] ?? null;

if ($taskId === null || !is_numeric($taskId) || (int) $taskId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing task_id.']);
    exit;
}

$taskId = (int) $taskId;

$taskStmt = $conn->prepare("
    SELECT id, title
    FROM tasks
    WHERE id = ?
    LIMIT 1
");
$taskStmt->execute([$taskId]);

$task = $taskStmt->fetch(PDO::FETCH_ASSOC);

if (!$task) {
    http_response_code(404);
    echo json_encode(['error' => 'Task not found.']);
    exit;
}

$markStmt = $conn->prepare("
    UPDATE messages
    SET is_read = 1,
        read_at = NOW()
    WHERE task_id = ?
      AND recipient_id = ?
      AND is_read = 0
");
$markStmt->execute([$taskId, $currentUserId]);

$msgStmt = $conn->prepare("
    SELECT
        m.id,
        m.message,
        m.time_sent,
        m.is_read,
        m.read_at,
        m.sender_id,
        m.recipient_id,

        s.name AS sender_name,
        s.role AS sender_role,
        s.profile_image AS sender_profile_image,

        r.name AS recipient_name,
        r.role AS recipient_role,
        r.profile_image AS recipient_profile_image

    FROM messages m
    INNER JOIN users s ON s.id = m.sender_id
    INNER JOIN users r ON r.id = m.recipient_id
    WHERE m.task_id = ?
    ORDER BY m.time_sent ASC, m.id ASC
");
$msgStmt->execute([$taskId]);

$msgRows = $msgStmt->fetchAll(PDO::FETCH_ASSOC);

$attStmt = $conn->prepare("
    SELECT id, message_id, file_name, file_path, uploaded_at
    FROM message_attachments
    WHERE message_id = ?
    ORDER BY uploaded_at ASC, id ASC
");

$messages = [];

foreach ($msgRows as $msg) {
    $attStmt->execute([(int) $msg['id']]);
    $attachments = $attStmt->fetchAll(PDO::FETCH_ASSOC);

    $senderName = (string) $msg['sender_name'];
    $recipientName = (string) $msg['recipient_name'];
    $senderRole = (string) $msg['sender_role'];
    $recipientRole = (string) $msg['recipient_role'];

    $messages[] = [
        'id'                           => (int) $msg['id'],
        'message'                      => (string) $msg['message'],
        'time_sent'                    => $msg['time_sent'],
        'is_read'                      => (bool) $msg['is_read'],
        'read_at'                      => $msg['read_at'],

        'sender_id'                    => (int) $msg['sender_id'],
        'sender_name'                  => $senderName,
        'sender_role'                  => $senderRole,
        'sender_role_label'            => getRoleLabel($senderRole),
        'sender_initials'              => getInitials($senderName),
        'sender_profile_image'         => $msg['sender_profile_image'] ?? null,
        'sender_profile_image_url'     => getProfileImageUrl($msg['sender_profile_image'] ?? null),

        'recipient_id'                 => (int) $msg['recipient_id'],
        'recipient_name'               => $recipientName,
        'recipient_role'               => $recipientRole,
        'recipient_role_label'         => getRoleLabel($recipientRole),
        'recipient_initials'           => getInitials($recipientName),
        'recipient_profile_image'      => $msg['recipient_profile_image'] ?? null,
        'recipient_profile_image_url'  => getProfileImageUrl($msg['recipient_profile_image'] ?? null),

        'attachments'                  => array_map(function (array $a): array {
            return [
                'id'          => (int) $a['id'],
                'message_id'  => (int) $a['message_id'],
                'file_name'   => $a['file_name'],
                'file_path'   => $a['file_path'],
                'uploaded_at' => $a['uploaded_at'],
            ];
        }, $attachments),
    ];
}

echo json_encode([
    'task_id' => $taskId,
    'task'    => [
        'id'    => (int) $task['id'],
        'title' => (string) $task['title'],
    ],
    'messages' => $messages,
    'total'    => count($messages),
], JSON_UNESCAPED_SLASHES);