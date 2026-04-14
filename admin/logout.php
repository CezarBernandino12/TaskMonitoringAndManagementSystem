<?php
// ====================================================================
// admin/logout.php
// Logs the logout event, destroys the admin session, then redirects
// to the login page.
// ====================================================================
require_once '../config/db.php';
require_once '../config/log_activity.php';

session_name('ADMIN_SESSION');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Log before destroying the session so user_id is still available
if (!empty($_SESSION['user_id'])) {
    $userId = (int)$_SESSION['user_id'];

    // Fetch name for a readable description
    $stmt = $conn->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $row  = $stmt->fetch(PDO::FETCH_ASSOC);
    $name = $row['name'] ?? "User #{$userId}";

    logActivity($conn, 'auth.logout', 'user', $userId, "Logout: {$name}");
}

// Destroy session cleanly
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $p['path'], $p['domain'], $p['secure'], $p['httponly']
    );
}
session_destroy();

header('Location: ../auth/login.html');
exit;
