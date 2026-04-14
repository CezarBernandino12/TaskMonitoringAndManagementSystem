<?php
// ====================================================================
// log_activity.php
// Reusable helper – include this file in any PHP action handler,
// then call logActivity($conn, $action, $targetType, $targetId, $desc)
//
// Requires:
//   - $conn  → PDO connection (from config/db.php)
//   - A valid session with $_SESSION['user_id'] set
// ====================================================================

function logActivity(
    PDO    $conn,
    string $action,
    string $targetType = '',
    int    $targetId   = 0,
    string $description = ''
): void {
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userId = (int)($_SESSION['user_id'] ?? 0);
        if ($userId === 0) {
            return; // nothing to log if not authenticated
        }

        // Resolve caller name + role from the DB (authoritative source)
        $stmt = $conn->prepare(
            "SELECT name, role FROM users WHERE id = ? LIMIT 1"
        );
        $stmt->execute([$userId]);
        $caller = $stmt->fetch(PDO::FETCH_ASSOC);

        $userName = $caller['name'] ?? '';
        $role     = $caller['role'] ?? '';

        $ins = $conn->prepare("
            INSERT INTO activity_logs
                (user_id, user_name, role, action, target_type, target_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $userId,
            $userName,
            $role,
            $action,
            $targetType ?: null,
            $targetId   ?: null,
            $description ?: null,
        ]);
    } catch (Throwable $e) {
        // Logging must never break the main action – swallow silently
        error_log('[activity_log] ' . $e->getMessage());
    }
}
