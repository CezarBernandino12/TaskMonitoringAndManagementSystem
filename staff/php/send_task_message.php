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
$senderId = $_SESSION['user_id'] ?? null;
if (!$senderId) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ====================================================================
// INPUT — accepts multipart/form-data (for file attachments)
// or JSON (for text-only messages)
// ====================================================================
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isJson      = str_contains($contentType, 'application/json');

if ($isJson) {
    $body        = json_decode(file_get_contents('php://input'), true);
    $recipientId = $body['recipient_id'] ?? null;
    $message     = trim($body['message'] ?? '');
    $files       = [];
} else {
    $recipientId = $_POST['recipient_id'] ?? null;
    $message     = trim($_POST['message'] ?? '');
    $files       = $_FILES['attachments'] ?? [];
}

// ====================================================================
// VALIDATION
// ====================================================================
// task_id is optional — messages sent from the inbox (not from a task thread) have no task context
$taskId = null;
if (isset($body['task_id']) || isset($_POST['task_id'])) {
    $rawTaskId = $isJson ? ($body['task_id'] ?? null) : ($_POST['task_id'] ?? null);
    if ($rawTaskId !== null) {
        if (!is_numeric($rawTaskId) || (int)$rawTaskId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid task_id.']);
            exit;
        }
        $taskId = (int)$rawTaskId;
    }
}

if (!$recipientId || !is_numeric($recipientId) || (int)$recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing recipient_id.']);
    exit;
}
if ($message === '' && empty($files)) {
    http_response_code(400);
    echo json_encode(['error' => 'Message cannot be empty.']);
    exit;
}
if (mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Message exceeds 5000 character limit.']);
    exit;
}

$recipientId = (int)$recipientId;

// Verify task exists only when a task_id was provided
if ($taskId !== null) {
    $taskCheck = $conn->prepare("SELECT id FROM tasks WHERE id = ?");
    $taskCheck->execute([$taskId]);
    if (!$taskCheck->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Task not found.']);
        exit;
    }
}

// Verify recipient exists and is active
$recipCheck = $conn->prepare("SELECT id, name FROM users WHERE id = ? AND is_active = 1");
$recipCheck->execute([$recipientId]);
$recipient = $recipCheck->fetch(PDO::FETCH_ASSOC);
if (!$recipient) {
    http_response_code(404);
    echo json_encode(['error' => 'Recipient not found or inactive.']);
    exit;
}

// ====================================================================
// INSERT MESSAGE
// ====================================================================
$conn->beginTransaction();
try {
    $insStmt = $conn->prepare("
        INSERT INTO messages (message, task_id, sender_id, recipient_id, time_sent)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $insStmt->execute([$message, $taskId, $senderId, $recipientId]); // $taskId may be null
    $messageId = (int)$conn->lastInsertId();

    // ====================================================================
    // HANDLE FILE ATTACHMENTS
    // ====================================================================
    $savedAttachments = [];
    $uploadDir = '../../uploads/task_messages/';

    if (!empty($files) && isset($files['name'])) {
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $names = is_array($files['name']) ? $files['name'] : [$files['name']];
        $tmps  = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
        $errs  = is_array($files['error'])    ? $files['error']    : [$files['error']];

        $allowedTypes = ['image/jpeg','image/png','image/gif','image/webp',
                         'application/pdf','text/plain',
                         'application/msword',
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/vnd.ms-excel',
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        $maxSize = 5 * 1024 * 1024; // 5 MB

        foreach ($names as $i => $originalName) {
            if ($errs[$i] !== UPLOAD_ERR_OK) continue;

            $tmpPath  = $tmps[$i];
            $fileSize = filesize($tmpPath);
            $mimeType = mime_content_type($tmpPath);

            if ($fileSize > $maxSize) continue;
            if (!in_array($mimeType, $allowedTypes)) continue;

            $ext      = pathinfo($originalName, PATHINFO_EXTENSION);
            $safeName = uniqid('msg_', true) . '.' . strtolower($ext);
            $destPath = $uploadDir . $safeName;

            if (move_uploaded_file($tmpPath, $destPath)) {
                $attStmt = $conn->prepare("
                    INSERT INTO message_attachments (message_id, file_name, file_path)
                    VALUES (?, ?, ?)
                ");
                $attStmt->execute([$messageId, $originalName, 'uploads/task_messages/' . $safeName]);
                $savedAttachments[] = [
                    'id'        => (int)$conn->lastInsertId(),
                    'file_name' => $originalName,
                    'file_path' => 'uploads/task_messages/' . $safeName,
                ];
            }
        }
    }

    $conn->commit();

    // Return the newly created message with sender info
    $senderStmt = $conn->prepare("SELECT name, role FROM users WHERE id = ?");
    $senderStmt->execute([$senderId]);
    $sender = $senderStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => [
            'id'             => $messageId,
            'message'        => $message,
            'time_sent'      => date('Y-m-d H:i:s'),
            'is_read'        => false,
            'sender_id'      => $senderId,
            'sender_name'    => $sender['name'],
            'sender_role'    => $sender['role'],
            'recipient_id'   => $recipientId,
            'recipient_name' => $recipient['name'],
            'attachments'    => $savedAttachments,
        ],
    ]);
} catch (Exception $e) {
    $conn->rollBack();
    throw $e;
}