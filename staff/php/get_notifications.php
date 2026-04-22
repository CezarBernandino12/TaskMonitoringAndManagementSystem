<?php
/**
 * staff/php/get_notifications.php
 *
 * Returns task-deadline notifications scoped to the logged-in staff member.
 * Only tasks assigned directly to the user are included.
 *
 * Notification types:
 *   task_overdue   — deadline has passed
 *   task_due_today — deadline is today
 *   task_due_soon  — deadline is tomorrow
 */

date_default_timezone_set('Asia/Manila');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../../config/db.php';
require_once '../../config/notifications.php';

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['notifications' => [], 'unread_count' => 0]);
    exit();
}

$userId = (int) $_SESSION['user_id'];
$today  = date('Y-m-d');

try {
    // Tasks assigned to this staff member that are overdue, due today, or due tomorrow.
    $stmt = $conn->prepare("
        SELECT id, title, deadline
        FROM   tasks
        WHERE  assigned_to = :uid
          AND  status      != 'Completed'
          AND  deadline    <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ORDER BY deadline ASC
    ");
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $readKeys = getReadKeys($conn, $userId);
    $items    = [];

    foreach ($tasks as $task) {
        $meta = classifyDeadline($task['deadline'], $today);
        if ($meta === null) {
            continue;
        }

        $key    = "task-{$task['id']}-{$meta['type']}";
        $desc   = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8')
                . ' • '
                . formatDeadlineLabel($task['deadline']);

        $items[] = makeNotif(
            $key,
            $meta,
            $meta['label'],
            $desc,
            !isset($readKeys[$key]),
            (int) $task['id']
        );
    }

    $items       = sortNotifications($items);
    $unreadCount = count(array_filter($items, static fn($n) => $n['unread']));

    echo json_encode([
        'notifications' => $items,
        'unread_count'  => $unreadCount,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['notifications' => [], 'unread_count' => 0]);
}
