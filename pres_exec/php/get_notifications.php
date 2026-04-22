<?php
/**
 * pres_exec/php/get_notifications.php
 *
 * Returns escalated, executive-level notifications for president /
 * executive director users.
 *
 * Notification types produced:
 *   system_alert   — organisation-wide overdue summary, due-today summary
 *   critical_delay — departments with 5+ overdue tasks, high-priority overdue tasks
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
    // 1. Organisation-wide overdue summary
    // -------------------------------------------------------------------------
    $totalStmt = $conn->prepare("
        SELECT COUNT(*) AS cnt
        FROM   tasks
        WHERE  status   != 'Completed'
          AND  deadline  < CURDATE()
    ");
    $totalStmt->execute();
    $totalOverdue = (int) $totalStmt->fetchColumn();

    if ($totalOverdue > 0) {
        $key  = 'exec-total-overdue-' . date('Y-m-d');
        $meta = [
            'type'      => 'system_alert',
            'label'     => 'Organisation Overview',
            'icon'      => 'bi-graph-down-arrow',
            'iconColor' => 'notif-red',
            'timeLabel' => 'As of today',
            'priority'  => 0,
        ];
        $desc = "{$totalOverdue} overdue task"
              . ($totalOverdue !== 1 ? 's' : '')
              . ' across all departments';

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]));
    }

    // -------------------------------------------------------------------------
    // 2. Departments with 5 or more overdue tasks (escalated threshold)
    // -------------------------------------------------------------------------
    $critDeptStmt = $conn->prepare("
        SELECT d.id, d.name AS department_name, COUNT(t.id) AS overdue_count
        FROM   tasks t
        INNER JOIN departments d ON d.id = t.department_id
        WHERE  t.status   != 'Completed'
          AND  t.deadline  < CURDATE()
        GROUP  BY d.id, d.name
        HAVING overdue_count >= 5
        ORDER  BY overdue_count DESC
        LIMIT 8
    ");
    $critDeptStmt->execute();

    foreach ($critDeptStmt->fetchAll(PDO::FETCH_ASSOC) as $dept) {
        $key      = "exec-dept-critical-{$dept['id']}";
        $deptName = htmlspecialchars($dept['department_name'], ENT_QUOTES, 'UTF-8');
        $count    = (int) $dept['overdue_count'];

        $meta = [
            'type'      => 'critical_delay',
            'label'     => 'Critical Department Delay',
            'icon'      => 'bi-building-exclamation',
            'iconColor' => 'notif-red',
            'timeLabel' => 'Escalated',
            'priority'  => 0,
        ];
        $desc = "{$deptName}: {$count} overdue task" . ($count !== 1 ? 's' : '') . ' require attention';

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]));
    }

    // -------------------------------------------------------------------------
    // 3. High-priority overdue tasks (top 10 for executive review)
    // -------------------------------------------------------------------------
    $hpStmt = $conn->prepare("
        SELECT t.id, t.title, t.deadline,
               u.first_name, u.last_name,
               d.name AS department_name
        FROM   tasks t
        INNER JOIN users       u ON u.id = t.assigned_to
        LEFT  JOIN departments d ON d.id = t.department_id
        WHERE  t.status   != 'Completed'
          AND  t.deadline  < CURDATE()
          AND  t.priority  = 'High'
        ORDER BY t.deadline ASC
        LIMIT 10
    ");
    $hpStmt->execute();

    foreach ($hpStmt->fetchAll(PDO::FETCH_ASSOC) as $task) {
        $key       = "exec-hp-{$task['id']}";
        $name      = htmlspecialchars($task['first_name'] . ' ' . $task['last_name'], ENT_QUOTES, 'UTF-8');
        $taskTitle = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8');
        $dept      = $task['department_name']
                   ? htmlspecialchars($task['department_name'], ENT_QUOTES, 'UTF-8')
                   : '';

        $meta = [
            'type'      => 'critical_delay',
            'label'     => 'High-Priority Overdue',
            'icon'      => 'bi-exclamation-triangle',
            'iconColor' => 'notif-red',
            'timeLabel' => 'Past deadline',
            'priority'  => 1,
        ];
        $prefix = $dept ? "[{$dept}] " : '';
        $desc   = "{$prefix}{$name}: \"{$taskTitle}\"";

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]), (int) $task['id']);
    }

    // -------------------------------------------------------------------------
    // 4. Organisation-wide due-today summary
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
        $key  = 'exec-due-today-' . date('Y-m-d');
        $meta = [
            'type'      => 'system_alert',
            'label'     => 'Tasks Due Today',
            'icon'      => 'bi-calendar2-check',
            'iconColor' => 'notif-amber',
            'timeLabel' => 'Today',
            'priority'  => 2,
        ];
        $verb = $dueTodayCount !== 1 ? 'are' : 'is';
        $desc = "{$dueTodayCount} task" . ($dueTodayCount !== 1 ? 's' : '') . " {$verb} due today organisation-wide";

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]));
    }

    // -------------------------------------------------------------------------
    // Event-proximity alerts: events tagged to this user starting today/tomorrow
    // -------------------------------------------------------------------------
    $today = date('Y-m-d');
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

    // Merge in persistent (event-driven) notifications (e.g. announcements sent to exec).
    $storedItems = storedNotificationsToItems(getStoredNotifications($conn, $userId, 15));
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
