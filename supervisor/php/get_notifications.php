<?php
/**
 * supervisor/php/get_notifications.php
 *
 * Returns notifications for a supervisor, covering two scopes:
 *
 *  1. Own tasks — same deadline-based alerts as staff.
 *  2. Team tasks — overdue tasks and tasks due today belonging to staff
 *     members in the supervisor's department.
 *
 * Notification types:
 *   task_overdue   — supervisor's own task is past deadline
 *   task_due_today — supervisor's own task is due today
 *   task_due_soon  — supervisor's own task is due tomorrow
 *   team_overdue   — a team member's task is past deadline
 *   task_due_today (team context) — a team member's task is due today
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
    $readKeys = getReadKeys($conn, $userId);
    $items    = [];

    // -------------------------------------------------------------------------
    // 1. Supervisor's own tasks (overdue / due today / due tomorrow)
    // -------------------------------------------------------------------------
    $ownStmt = $conn->prepare("
        SELECT id, title, deadline
        FROM   tasks
        WHERE  assigned_to = :uid
          AND  status      != 'Completed'
          AND  deadline    <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ORDER BY deadline ASC
    ");
    $ownStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $ownStmt->execute();

    foreach ($ownStmt->fetchAll(PDO::FETCH_ASSOC) as $task) {
        $meta = classifyDeadline($task['deadline'], $today);
        if ($meta === null) {
            continue;
        }

        $key    = "task-{$task['id']}-{$meta['type']}";
        $desc   = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8')
                . ' • '
                . formatDeadlineLabel($task['deadline']);

        $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]), (int) $task['id']);
    }

    // -------------------------------------------------------------------------
    // 2. Resolve the supervisor's department
    // -------------------------------------------------------------------------
    $deptStmt = $conn->prepare(
        "SELECT department_id FROM users WHERE id = :uid AND role = 'supervisor' LIMIT 1"
    );
    $deptStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $deptStmt->execute();
    $deptRow = $deptStmt->fetch(PDO::FETCH_ASSOC);

    if ($deptRow && $deptRow['department_id']) {
        $deptId = (int) $deptRow['department_id'];

        // ---------------------------------------------------------------------
        // 3. Team members' overdue tasks (up to 20 most urgent)
        // ---------------------------------------------------------------------
        $overdueStmt = $conn->prepare("
            SELECT t.id, t.title, t.deadline,
                   u.first_name, u.last_name
            FROM   tasks t
            INNER JOIN users u ON u.id = t.assigned_to
            WHERE  u.department_id = :dept
              AND  u.role          = 'staff'
              AND  t.status        != 'Completed'
              AND  t.deadline      < CURDATE()
            ORDER BY t.deadline ASC
            LIMIT 20
        ");
        $overdueStmt->bindValue(':dept', $deptId, PDO::PARAM_INT);
        $overdueStmt->execute();

        foreach ($overdueStmt->fetchAll(PDO::FETCH_ASSOC) as $task) {
            $key  = "team-task-{$task['id']}-overdue";
            $name = htmlspecialchars(
                $task['first_name'] . ' ' . $task['last_name'],
                ENT_QUOTES, 'UTF-8'
            );
            $taskTitle = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8');

            $meta = [
                'type'      => 'team_overdue',
                'label'     => 'Team Task Overdue',
                'icon'      => 'bi-people',
                'iconColor' => 'notif-red',
                'timeLabel' => 'Past deadline',
                'priority'  => 0,
            ];
            $desc = "{$name}: \"{$taskTitle}\" • " . formatDeadlineLabel($task['deadline']);

            $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]), (int) $task['id']);
        }

        // ---------------------------------------------------------------------
        // 4. Team members' tasks due today (up to 10)
        // ---------------------------------------------------------------------
        $dueTodayStmt = $conn->prepare("
            SELECT t.id, t.title,
                   u.first_name, u.last_name
            FROM   tasks t
            INNER JOIN users u ON u.id = t.assigned_to
            WHERE  u.department_id = :dept
              AND  u.role          = 'staff'
              AND  t.status        != 'Completed'
              AND  t.deadline      = CURDATE()
            ORDER BY t.id ASC
            LIMIT 10
        ");
        $dueTodayStmt->bindValue(':dept', $deptId, PDO::PARAM_INT);
        $dueTodayStmt->execute();

        foreach ($dueTodayStmt->fetchAll(PDO::FETCH_ASSOC) as $task) {
            $key  = "team-task-{$task['id']}-task_due_today";
            $name = htmlspecialchars(
                $task['first_name'] . ' ' . $task['last_name'],
                ENT_QUOTES, 'UTF-8'
            );
            $taskTitle = htmlspecialchars($task['title'], ENT_QUOTES, 'UTF-8');

            $meta = [
                'type'      => 'task_due_today',
                'label'     => 'Team Task Due Today',
                'icon'      => 'bi-calendar2-check',
                'iconColor' => 'notif-amber',
                'timeLabel' => 'Today',
                'priority'  => 1,
            ];
            $desc = "{$name}: \"{$taskTitle}\"";

            $items[] = makeNotif($key, $meta, $meta['label'], $desc, !isset($readKeys[$key]), (int) $task['id']);
        }
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
