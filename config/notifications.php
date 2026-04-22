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
