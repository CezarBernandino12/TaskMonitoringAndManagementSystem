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
// INPUT VALIDATION
// ====================================================================
$taskId = $_GET['task_id'] ?? null;

if (!$taskId || !is_numeric($taskId) || (int)$taskId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing task_id.']);
    exit;
}
$taskId = (int)$taskId;

// ====================================================================
// FETCH MESSAGES FOR THIS TASK
// Returns all messages (comments) threaded by time_sent ascending.
// Each message includes the sender's name and avatar initials.
// Marks unread messages as read if the current user is the recipient.
// ====================================================================
$currentUserId = $_SESSION['user_id'] ?? null;

// Mark messages as read for the current user
if ($currentUserId) {
    $markStmt = $conn->prepare("
        UPDATE messages
        SET is_read = 1, read_at = NOW()
        WHERE task_id = ?
        AND recipient_id = ?
        AND is_read = 0
    ");
    $markStmt->execute([$taskId, $currentUserId]);
}

// Fetch all messages for this task
$msgStmt = $conn->prepare("
    SELECT
        m.id,
        m.message,
        m.time_sent,
        m.is_read,
        m.read_at,
        m.sender_id,
        m.recipient_id,
        s.name   AS sender_name,
        s.role   AS sender_role,
        r.name   AS recipient_name

    FROM messages m
    INNER JOIN users s ON s.id = m.sender_id
    INNER JOIN users r ON r.id = m.recipient_id

    WHERE m.task_id = ?
    ORDER BY m.time_sent ASC
");
$msgStmt->execute([$taskId]);
$msgRows = $msgStmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch attachments for each message
$attStmt = $conn->prepare("
    SELECT id, message_id, file_name, file_path, uploaded_at
    FROM message_attachments
    WHERE message_id = ?
    ORDER BY uploaded_at ASC
");

$messages = [];
foreach ($msgRows as $msg) {
    $attStmt->execute([$msg['id']]);
    $attachments = $attStmt->fetchAll(PDO::FETCH_ASSOC);

    $messages[] = [
        'id'             => (int)$msg['id'],
        'message'        => $msg['message'],
        'time_sent'      => $msg['time_sent'],
        'is_read'        => (bool)$msg['is_read'],
        'sender_id'      => (int)$msg['sender_id'],
        'sender_name'    => $msg['sender_name'],
        'sender_role'    => $msg['sender_role'],
        'recipient_id'   => (int)$msg['recipient_id'],
        'recipient_name' => $msg['recipient_name'],
        'attachments'    => array_map(fn($a) => [
            'id'          => (int)$a['id'],
            'file_name'   => $a['file_name'],
            'file_path'   => $a['file_path'],
            'uploaded_at' => $a['uploaded_at'],
        ], $attachments),
    ];
}

echo json_encode([
    'task_id'  => $taskId,
    'messages' => $messages,
    'total'    => count($messages),
]);
