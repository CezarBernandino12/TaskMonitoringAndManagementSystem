<?php
/**
 * admin/php/get_notifications.php
 *
 * Returns high-level, system-wide notifications for admin users.
 * Focuses on critical situations rather than individual task details.
 *
 * Notification types produced:
 *   critical_delay  — individual high-priority task past deadline
 *   system_alert    — department with 3+ overdue tasks, or summary of due-today count
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

try {
    $readKeys = getReadKeys($conn, $userId);
    $items    = [];

    // -------------------------------------------------------------------------
    // 1. High-priority overdue tasks system-wide (top 15, oldest first)
    // -------------------------------------------------------------------------
    $hpStmt = $conn->prepare("
        SELECT t.id, t.title, t.deadline,
               u.first_name, u.last_name,
               d.name AS department_name
        FROM   tasks t
        INNER JOIN users       u ON u.id  = t.assigned_to
        LEFT  JOIN departments d ON d.id  = t.department_id
        WHERE  t.status   != 'Completed'
          AND  t.deadline  < CURDATE()
          AND  t.priority  = 'High'
        ORDER BY t.deadline ASC
        LIMIT 15
    ");
    $hpStmt->execute();

    foreach ($hpStmt->fetchAll(PDO::FETCH_ASSOC) as $task) {
        $key       = "admin-hp-overdue-{$task['id']}";
        $name      = htmlspecialchars($task['first_name'] . ' ' . $task['last_name'], ENT_QUOTES, 'UTF-8');
        $taskTitle = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8');
        $dept      = $task['department_name']
                   ? htmlspecialchars($task['department_name'], ENT_QUOTES, 'UTF-8')
                   : 'No Dept';

        $meta = [
            'type'      => 'critical_delay',
            'label'     => 'Critical Delay',
            'icon'      => 'bi-exclamation-triangle',
            'iconColor' => 'notif-red',
            'timeLabel' => 'Past deadline',
            'priority'  => 0,
        ];
        $desc = "[{$dept}] {$name}: \"{$taskTitle}\" • " . formatDeadlineLabel($task['deadline']);

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]), (int) $task['id']);
    }

    // -------------------------------------------------------------------------
    // 2. Departments with 3 or more overdue tasks
    // -------------------------------------------------------------------------
    $deptStmt = $conn->prepare("
        SELECT d.id, d.name AS department_name, COUNT(t.id) AS overdue_count
        FROM   tasks t
        INNER JOIN departments d ON d.id = t.department_id
        WHERE  t.status   != 'Completed'
          AND  t.deadline  < CURDATE()
        GROUP  BY d.id, d.name
        HAVING overdue_count >= 3
        ORDER  BY overdue_count DESC
        LIMIT 10
    ");
    $deptStmt->execute();

    foreach ($deptStmt->fetchAll(PDO::FETCH_ASSOC) as $dept) {
        $key      = "admin-dept-overdue-{$dept['id']}";
        $deptName = htmlspecialchars($dept['department_name'], ENT_QUOTES, 'UTF-8');
        $count    = (int) $dept['overdue_count'];

        $meta = [
            'type'      => 'system_alert',
            'label'     => 'Department Alert',
            'icon'      => 'bi-building-exclamation',
            'iconColor' => 'notif-amber',
            'timeLabel' => 'Multiple overdue',
            'priority'  => 1,
        ];
        $desc = "{$deptName}: {$count} overdue task" . ($count !== 1 ? 's' : '');

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]));
    }

    // -------------------------------------------------------------------------
    // 3. System-wide tasks due today — shown as a single summary item
    // -------------------------------------------------------------------------
    $dueTodayStmt = $conn->prepare("
        SELECT COUNT(*) AS cnt
        FROM   tasks
        WHERE  status   != 'Completed'
          AND  deadline  = CURDATE()
    ");
    $dueTodayStmt->execute();
    $dueTodayCount = (int) $dueTodayStmt->fetchColumn();

    if ($dueTodayCount > 0) {
        $key  = 'admin-due-today-' . date('Y-m-d');
        $meta = [
            'type'      => 'system_alert',
            'label'     => 'Tasks Due Today',
            'icon'      => 'bi-calendar2-check',
            'iconColor' => 'notif-blue',
            'timeLabel' => 'Today',
            'priority'  => 2,
        ];
        $verb = $dueTodayCount !== 1 ? 'are' : 'is';
        $desc = "{$dueTodayCount} task" . ($dueTodayCount !== 1 ? 's' : '') . " {$verb} due today across all teams";

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]));
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
