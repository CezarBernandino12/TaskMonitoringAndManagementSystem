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

if (session_status() === PHP_SESSION_NONE) { session_start(); }
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$senderId = (int) $_SESSION['user_id'];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isJson = stripos($contentType, 'application/json') !== false;

$body = [];
$files = [];

if ($isJson) {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        $body = [];
    }

    $recipientId = $body['recipient_id'] ?? null;
    $message = trim((string) ($body['message'] ?? ''));
} else {
    $recipientId = $_POST['recipient_id'] ?? null;
    $message = trim((string) ($_POST['message'] ?? ''));
    $files = $_FILES['attachments'] ?? [];
}

$taskId = null;
$rawTaskId = $isJson ? ($body['task_id'] ?? null) : ($_POST['task_id'] ?? null);

if ($rawTaskId !== null && $rawTaskId !== '') {
    if (!is_numeric($rawTaskId) || (int) $rawTaskId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid task_id.']);
        exit;
    }

    $taskId = (int) $rawTaskId;
}

if ($recipientId === null || !is_numeric($recipientId) || (int) $recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing recipient_id.']);
    exit;
}

$recipientId = (int) $recipientId;

if ($recipientId === $senderId) {
    http_response_code(400);
    echo json_encode(['error' => 'You cannot send a message to yourself.']);
    exit;
}

if ($message === '' && (empty($files) || empty($files['name']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Message cannot be empty.']);
    exit;
}

if (mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Message exceeds 5000 character limit.']);
    exit;
}

if ($taskId !== null) {
    $taskCheck = $conn->prepare("
        SELECT id
        FROM tasks
        WHERE id = ?
        LIMIT 1
    ");
    $taskCheck->execute([$taskId]);

    if (!$taskCheck->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(404);
        echo json_encode(['error' => 'Task not found.']);
        exit;
    }
}

$recipientStmt = $conn->prepare("
    SELECT id, name, role, profile_image
    FROM users
    WHERE id = ?
      AND is_active = 1
    LIMIT 1
");
$recipientStmt->execute([$recipientId]);

$recipient = $recipientStmt->fetch(PDO::FETCH_ASSOC);

if (!$recipient) {
    http_response_code(404);
    echo json_encode(['error' => 'Recipient not found or inactive.']);
    exit;
}

$conn->beginTransaction();

try {
    $insertStmt = $conn->prepare("
        INSERT INTO messages (
            message,
            task_id,
            sender_id,
            recipient_id,
            time_sent
        ) VALUES (?, ?, ?, ?, NOW())
    ");
    $insertStmt->execute([
        $message,
        $taskId,
        $senderId,
        $recipientId
    ]);

    $messageId = (int) $conn->lastInsertId();
    $savedAttachments = [];

    $uploadDir = dirname(__DIR__) . '/uploads/task_messages/';
    $publicUploadPrefix = 'uploads/task_messages/';

    if (!empty($files) && isset($files['name'])) {
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
            throw new RuntimeException('Failed to create attachment upload directory.');
        }

        $names = is_array($files['name']) ? $files['name'] : [$files['name']];
        $tmpNames = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
        $errors = is_array($files['error']) ? $files['error'] : [$files['error']];
        $sizes = is_array($files['size']) ? $files['size'] : [$files['size']];

        $allowedMimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
            'text/plain' => 'txt',
            'application/msword' => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        ];

        $maxSize = 5 * 1024 * 1024;

        $attachmentInsertStmt = $conn->prepare("
            INSERT INTO message_attachments (message_id, file_name, file_path)
            VALUES (?, ?, ?)
        ");

        foreach ($names as $index => $originalName) {
            $error = $errors[$index] ?? UPLOAD_ERR_NO_FILE;

            if ($error === UPLOAD_ERR_NO_FILE) {
                continue;
            }

            if ($error !== UPLOAD_ERR_OK) {
                continue;
            }

            $tmpPath = $tmpNames[$index] ?? '';
            $fileSize = (int) ($sizes[$index] ?? 0);

            if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
                continue;
            }

            if ($fileSize <= 0 || $fileSize > $maxSize) {
                continue;
            }

            $mimeType = mime_content_type($tmpPath) ?: '';

            if (!isset($allowedMimeTypes[$mimeType])) {
                continue;
            }

            $extension = $allowedMimeTypes[$mimeType];
            $safeFileName = 'msg_' . $messageId . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
            $destination = $uploadDir . $safeFileName;

            if (!move_uploaded_file($tmpPath, $destination)) {
                continue;
            }

            $publicPath = $publicUploadPrefix . $safeFileName;

            $attachmentInsertStmt->execute([
                $messageId,
                (string) $originalName,
                $publicPath
            ]);

            $savedAttachments[] = [
                'id'          => (int) $conn->lastInsertId(),
                'message_id'  => $messageId,
                'file_name'   => (string) $originalName,
                'file_path'   => $publicPath,
                'uploaded_at' => date('Y-m-d H:i:s'),
            ];
        }
    }

    $senderStmt = $conn->prepare("
        SELECT id, name, role, profile_image
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $senderStmt->execute([$senderId]);

    $sender = $senderStmt->fetch(PDO::FETCH_ASSOC);

    if (!$sender) {
        throw new RuntimeException('Sender not found.');
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => [
            'id'                           => $messageId,
            'message'                      => $message,
            'time_sent'                    => date('Y-m-d H:i:s'),
            'is_read'                      => false,
            'read_at'                      => null,

            'sender_id'                    => (int) $sender['id'],
            'sender_name'                  => (string) $sender['name'],
            'sender_role'                  => (string) $sender['role'],
            'sender_role_label'            => getRoleLabel((string) $sender['role']),
            'sender_initials'              => getInitials((string) $sender['name']),
            'sender_profile_image'         => $sender['profile_image'] ?? null,
            'sender_profile_image_url'     => getProfileImageUrl($sender['profile_image'] ?? null),

            'recipient_id'                 => (int) $recipient['id'],
            'recipient_name'               => (string) $recipient['name'],
            'recipient_role'               => (string) $recipient['role'],
            'recipient_role_label'         => getRoleLabel((string) $recipient['role']),
            'recipient_initials'           => getInitials((string) $recipient['name']),
            'recipient_profile_image'      => $recipient['profile_image'] ?? null,
            'recipient_profile_image_url'  => getProfileImageUrl($recipient['profile_image'] ?? null),

            'task_id'                      => $taskId,
            'attachments'                  => $savedAttachments,
        ],
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    throw $e;
}