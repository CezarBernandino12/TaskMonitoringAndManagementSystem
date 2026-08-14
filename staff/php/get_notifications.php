<?php
require_once __DIR__ . '/_auth.php';
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

    // -------------------------------------------------------------------------
    // Event-proximity alerts: events tagged to this user starting today/tomorrow
    // -------------------------------------------------------------------------
    $evtProxStmt = $conn->prepare("
        SELECT e.id, e.title, e.start_date, e.location
        FROM   events e
        INNER JOIN event_employees ee ON ee.event_id = e.id
        WHERE  ee.user_id = :uid
          AND  e.status NOT IN ('Cancelled', 'Completed')
          AND  e.start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ORDER BY e.start_date ASC
        LIMIT 10
    ");
    $evtProxStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $evtProxStmt->execute();

    foreach ($evtProxStmt->fetchAll(PDO::FETCH_ASSOC) as $evt) {
        $diffDays = (int) round(
            (strtotime($evt['start_date']) - strtotime($today)) / 86400
        );
        if ($diffDays === 0) {
            $evtType  = 'event_today';
            $evtLabel = 'Event Today';
            $evtIcon  = 'bi-calendar-event';
            $evtColor = 'notif-amber';
            $evtTime  = 'Today';
            $evtPrio  = 3;
        } else {
            $evtType  = 'event_tomorrow';
            $evtLabel = 'Event Tomorrow';
            $evtIcon  = 'bi-calendar2-event';
            $evtColor = 'notif-blue';
            $evtTime  = 'Tomorrow';
            $evtPrio  = 4;
        }
        $key      = "event-prox-{$evt['id']}-{$evtType}";
        $evtTitle = htmlspecialchars($evt['title'], ENT_QUOTES, 'UTF-8');
        $evtLoc   = !empty($evt['location'])
                  ? htmlspecialchars($evt['location'], ENT_QUOTES, 'UTF-8') . ' \u2022 '
                  : '';
        $evtMeta  = [
            'type'      => $evtType,
            'label'     => $evtLabel,
            'icon'      => $evtIcon,
            'iconColor' => $evtColor,
            'timeLabel' => $evtTime,
            'priority'  => $evtPrio,
        ];
        $items[] = makeNotif(
            $key, $evtMeta, $evtLabel,
            "{$evtTitle} \u2022 {$evtLoc}" . formatDeadlineLabel($evt['start_date']),
            !isset($readKeys[$key])
        );
    }

    // Merge in persistent (event-driven) notifications from the DB.
    $storedItems = storedNotificationsToItems(getStoredNotifications($conn, $userId, 20));
    $items       = array_merge($storedItems, $items);

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
