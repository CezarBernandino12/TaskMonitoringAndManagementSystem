<?php
/**
 * config/notifications.php
 *
 * Shared helpers for the role-based notification system.
 * Include this file AFTER config/db.php in each role's get_notifications.php
 * and mark_notification_read.php.
 */

/**
 * Return a set of notification keys the user has already read.
 * Keys are stored as array values; the returned array is flipped for O(1) lookup.
 *
 * @param  PDO $conn
 * @param  int $userId
 * @return array  [key => true, ...]
 */
function getReadKeys(PDO $conn, int $userId): array
{
    $stmt = $conn->prepare(
        "SELECT notification_key FROM notification_reads WHERE user_id = :uid"
    );
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->execute();

    return array_flip($stmt->fetchAll(PDO::FETCH_COLUMN));
}

/**
 * Persist a list of notification keys as read for the given user.
 * Uses INSERT IGNORE so duplicate calls are safe.
 *
 * @param  PDO      $conn
 * @param  int      $userId
 * @param  string[] $keys
 */
function markKeysRead(PDO $conn, int $userId, array $keys): void
{
    if (empty($keys)) {
        return;
    }

    $stmt = $conn->prepare(
        "INSERT IGNORE INTO notification_reads (user_id, notification_key)
         VALUES (:uid, :key)"
    );

    foreach ($keys as $key) {
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':key', $key,    PDO::PARAM_STR);
        $stmt->execute();
    }
}

/**
 * Purge read entries older than $days days so the table stays lean.
 * Call this at most once per request (guarded by the caller).
 *
 * @param  PDO $conn
 * @param  int $days
 */
function pruneOldReads(PDO $conn, int $days = 30): void
{
    $stmt = $conn->prepare(
        "DELETE FROM notification_reads
         WHERE read_at < DATE_SUB(NOW(), INTERVAL :days DAY)"
    );
    $stmt->bindValue(':days', $days, PDO::PARAM_INT);
    $stmt->execute();
}

/**
 * Format a YYYY-MM-DD date string into a human-readable label (e.g. "Apr 20, 2026").
 *
 * @param  string $deadline
 * @return string
 */
function formatDeadlineLabel(string $deadline): string
{
    $ts = strtotime($deadline);
    return $ts !== false ? date('M j, Y', $ts) : $deadline;
}

/**
 * Classify a deadline relative to today and return display metadata.
 * Returns null if the deadline does not warrant a notification (> 1 day away).
 *
 * Notification types produced here:
 *   task_overdue   — deadline is in the past
 *   task_due_today — deadline is today
 *   task_due_soon  — deadline is tomorrow
 *
 * @param  string $deadline  YYYY-MM-DD
 * @param  string $today     YYYY-MM-DD
 * @return array|null
 */
function classifyDeadline(string $deadline, string $today): ?array
{
    $diffDays = (int) round(
        (strtotime($deadline) - strtotime($today)) / 86400
    );

    if ($diffDays < 0) {
        return [
            'type'      => 'task_overdue',
            'label'     => 'Overdue',
            'icon'      => 'bi-exclamation-circle',
            'iconColor' => 'notif-red',
            'timeLabel' => 'Past deadline',
            'priority'  => 0,
        ];
    }

    if ($diffDays === 0) {
        return [
            'type'      => 'task_due_today',
            'label'     => 'Due Today',
            'icon'      => 'bi-calendar2-check',
            'iconColor' => 'notif-amber',
            'timeLabel' => 'Today',
            'priority'  => 1,
        ];
    }

    if ($diffDays === 1) {
        return [
            'type'      => 'task_due_soon',
            'label'     => 'Due Tomorrow',
            'icon'      => 'bi-calendar2-event',
            'iconColor' => 'notif-blue',
            'timeLabel' => 'Tomorrow',
            'priority'  => 2,
        ];
    }

    return null;
}

/**
 * Build a single notification item array.
 *
 * @param  string      $key     Deterministic unique key
 * @param  array       $meta    Output from classifyDeadline() or an inline meta array
 * @param  string      $title   Display title
 * @param  string      $desc    Display description
 * @param  bool        $unread  Whether the notification is unread
 * @param  int|null    $taskId  Optional task reference
 * @return array
 */
function makeNotif(
    string $key,
    array  $meta,
    string $title,
    string $desc,
    bool   $unread,
    ?int   $taskId = null
): array {
    return [
        'key'       => $key,
        'type'      => $meta['type'],
        'icon'      => $meta['icon'],
        'iconColor' => $meta['iconColor'],
        'title'     => $title,
        'desc'      => $desc,
        'time'      => $meta['timeLabel'],
        'unread'    => $unread,
        'task_id'   => $taskId,
        '_priority' => $meta['priority'],
    ];
}

/**
 * Sort notification items by priority (ascending) and strip the internal sort key.
 *
 * @param  array $items
 * @return array
 */
function sortNotifications(array $items): array
{
    usort($items, static fn($a, $b) => $a['_priority'] <=> $b['_priority']);

    return array_map(static function (array $item): array {
        unset($item['_priority']);
        return $item;
    }, $items);
}

// ============================================================================
// Phase 2 — Persistent, event-driven notifications
// ============================================================================

/**
 * Return display metadata (icon, iconColor, sort priority) for a stored
 * notification type.
 *
 * Priority scale (lower = more urgent, sorts first):
 *   0-4   : computed deadline alerts (defined inline in get_notifications.php)
 *   5     : approval_request
 *   8     : announcement
 *  12-15  : task_assigned / status_changed / task_completed
 *  30-60  : computed team / system summary alerts
 */
function getNotifTypeMeta(string $type): array
{
    static $map = [
        'approval_request' => ['icon' => 'bi-patch-question', 'iconColor' => 'notif-amber',  'priority' => 5],
        'announcement'     => ['icon' => 'bi-megaphone',      'iconColor' => 'notif-purple', 'priority' => 8],
        'event_cancelled'  => ['icon' => 'bi-calendar-x',     'iconColor' => 'notif-red',    'priority' => 9],
        'event_created'    => ['icon' => 'bi-calendar-plus',  'iconColor' => 'notif-blue',   'priority' => 10],
        'event_updated'    => ['icon' => 'bi-calendar-check', 'iconColor' => 'notif-blue',   'priority' => 11],
        'task_assigned'    => ['icon' => 'bi-person-check',   'iconColor' => 'notif-green',  'priority' => 12],
        'task_completed'   => ['icon' => 'bi-check2-circle',  'iconColor' => 'notif-green',  'priority' => 12],
        'status_changed'   => ['icon' => 'bi-arrow-repeat',   'iconColor' => 'notif-blue',   'priority' => 13],
    ];
    return $map[$type] ?? ['icon' => 'bi-bell', 'iconColor' => 'notif-blue', 'priority' => 15];
}

/**
 * Return a human-readable relative-time string (e.g. "3h ago", "2d ago").
 */
function formatRelativeTime(string $datetime): string
{
    $ts = strtotime($datetime);
    if ($ts === false) return '';

    $diff = time() - $ts;
    if ($diff < 60)        return 'just now';
    if ($diff < 3600)      return floor($diff / 60) . 'm ago';
    if ($diff < 86400)     return floor($diff / 3600) . 'h ago';
    if ($diff < 86400 * 7) return floor($diff / 86400) . 'd ago';

    return date('M j', $ts);
}

/**
 * Insert a single persistent notification for one recipient.
 * When $sourceKey is supplied the INSERT uses IGNORE so duplicate events
 * (e.g. re-assigning the same task) are silently skipped.
 *
 * @param PDO     $conn
 * @param int     $recipientId  User who should receive the notification
 * @param int|null $actorId     User who triggered the event (null = system)
 * @param string  $type         One of: task_assigned, status_changed,
 *                              approval_request, announcement
 * @param string  $title        Short headline
 * @param string  $body         Detail text shown under the title
 * @param int|null $taskId      Related task ID (optional)
 * @param string|null $sourceKey Deduplication key; null for announcements
 */
function dispatchNotification(
    PDO     $conn,
    int     $recipientId,
    ?int    $actorId,
    string  $type,
    string  $title,
    string  $body,
    ?int    $taskId    = null,
    ?string $sourceKey = null
): void {
    if ($sourceKey !== null) {
        $stmt = $conn->prepare(
            "INSERT IGNORE INTO notifications
             (recipient_id, actor_id, type, title, body, task_id, source_key)
             VALUES (:rid, :aid, :type, :title, :body, :task_id, :src)"
        );
        $stmt->bindValue(':src', $sourceKey, PDO::PARAM_STR);
    } else {
        $stmt = $conn->prepare(
            "INSERT INTO notifications
             (recipient_id, actor_id, type, title, body, task_id)
             VALUES (:rid, :aid, :type, :title, :body, :task_id)"
        );
    }

    $stmt->bindValue(':rid',     $recipientId, PDO::PARAM_INT);
    $stmt->bindValue(':aid',     $actorId,     $actorId  !== null ? PDO::PARAM_INT  : PDO::PARAM_NULL);
    $stmt->bindValue(':type',    $type,        PDO::PARAM_STR);
    $stmt->bindValue(':title',   $title,       PDO::PARAM_STR);
    $stmt->bindValue(':body',    $body,        PDO::PARAM_STR);
    $stmt->bindValue(':task_id', $taskId,      $taskId   !== null ? PDO::PARAM_INT  : PDO::PARAM_NULL);
    $stmt->execute();
}

/**
 * Broadcast an announcement to every active user whose role is in $roles.
 * Returns the number of recipients notified.
 *
 * @param PDO    $conn
 * @param int    $actorId   Admin/user sending the announcement
 * @param array  $roles     e.g. ['staff', 'supervisor']
 * @param string $title
 * @param string $body
 * @return int   Recipient count
 */
function dispatchAnnouncementToRoles(
    PDO    $conn,
    int    $actorId,
    array  $roles,
    string $title,
    string $body
): int {
    if (empty($roles)) return 0;

    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $stmt = $conn->prepare(
        "SELECT id FROM users WHERE role IN ({$placeholders}) AND is_active = 1"
    );
    $stmt->execute($roles);
    $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $count = 0;
    foreach ($userIds as $userId) {
        dispatchNotification($conn, (int) $userId, $actorId, 'announcement', $title, $body);
        $count++;
    }
    return $count;
}

/**
 * Fetch the most recent stored notifications for a user.
 *
 * @param  PDO $conn
 * @param  int $userId
 * @param  int $limit  Maximum rows to return (default 25)
 * @return array  Raw DB rows
 */
function getStoredNotifications(PDO $conn, int $userId, int $limit = 25): array
{
    $stmt = $conn->prepare("
        SELECT  n.id,
                n.type,
                n.title,
                n.body,
                n.task_id,
                n.is_read,
                n.created_at,
                CONCAT(u.first_name, ' ', u.last_name) AS actor_name
        FROM    notifications n
        LEFT JOIN users u ON u.id = n.actor_id
        WHERE   n.recipient_id = :uid
        ORDER BY n.created_at DESC
        LIMIT   :lim
    ");
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Convert raw DB rows from getStoredNotifications() into standard
 * notification item arrays (same shape as makeNotif() output).
 *
 * Keys use the prefix "notif-{id}" so mark_notification_read.php can
 * distinguish them from computed deadline keys.
 *
 * @param  array $rows
 * @return array
 */
function storedNotificationsToItems(array $rows): array
{
    return array_map(static function (array $row): array {
        $meta = getNotifTypeMeta($row['type']);
        return [
            'key'       => 'notif-' . $row['id'],
            'type'      => $row['type'],
            'icon'      => $meta['icon'],
            'iconColor' => $meta['iconColor'],
            'title'     => htmlspecialchars_decode($row['title'],    ENT_QUOTES),
            'desc'      => htmlspecialchars_decode($row['body'] ?? '', ENT_QUOTES),
            'time'      => formatRelativeTime($row['created_at']),
            'unread'    => !(bool) $row['is_read'],
            'task_id'   => $row['task_id'] !== null ? (int) $row['task_id'] : null,
            '_priority' => $meta['priority'],
        ];
    }, $rows);
}

/**
 * Mark the given stored notification IDs as read for a specific user.
 * The recipient_id check prevents users from marking other users' notifications.
 *
 * @param PDO   $conn
 * @param int   $userId
 * @param int[] $ids   Notification row IDs to mark as read
 */
function markStoredNotificationsRead(PDO $conn, int $userId, array $ids): void
{
    if (empty($ids)) return;

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params       = array_merge($ids, [$userId]);

    $stmt = $conn->prepare(
        "UPDATE notifications
         SET    is_read = 1
         WHERE  id IN ({$placeholders})
           AND  recipient_id = ?"
    );
    $stmt->execute($params);
}
