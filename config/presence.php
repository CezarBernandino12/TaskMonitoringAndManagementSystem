<?php
declare(strict_types=1);

function markUserActive(PDO $conn, int $userId): void
{
    $stmt = $conn->prepare("
        UPDATE users
        SET last_active_at = NOW()
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);
}

function formatLastActiveLabel(?string $lastActiveAt): string
{
    if (!$lastActiveAt) {
        return 'last seen recently';
    }

    $last = strtotime($lastActiveAt);
    if ($last === false) {
        return 'last seen recently';
    }

    $diff = time() - $last;

    if ($diff < 60) {
        return 'just now';
    }

    if ($diff < 3600) {
        $mins = (int) floor($diff / 60);
        return $mins . ' minute' . ($mins !== 1 ? 's' : '') . ' ago';
    }

    if ($diff < 86400) {
        $hours = (int) floor($diff / 3600);
        return $hours . ' hour' . ($hours !== 1 ? 's' : '') . ' ago';
    }

    $days = (int) floor($diff / 86400);
    return $days . ' day' . ($days !== 1 ? 's' : '') . ' ago';
}

function buildPresenceMeta(?string $lastActiveAt, int $activeWindowSeconds = 120): array
{
    if (!$lastActiveAt) {
        return [
            'is_active_now' => false,
            'last_active_at' => null,
            'last_active_label' => 'last seen recently',
        ];
    }

    $last = strtotime($lastActiveAt);
    if ($last === false) {
        return [
            'is_active_now' => false,
            'last_active_at' => $lastActiveAt,
            'last_active_label' => 'last seen recently',
        ];
    }

    $isActiveNow = (time() - $last) <= $activeWindowSeconds;

    return [
        'is_active_now' => $isActiveNow,
        'last_active_at' => $lastActiveAt,
        'last_active_label' => $isActiveNow ? 'now' : formatLastActiveLabel($lastActiveAt),
    ];
}