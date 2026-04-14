<?php
require_once '../../config/db.php';

ob_start();
include '../../config/db.php';
ob_end_clean();

/**
 * Returns a unique session name per role so that each role maintains
 * its own independent session cookie in the browser. This allows, for
 * example, a Staff tab and a Supervisor tab to coexist in the same
 * browser without one login overwriting the other's session.
 */
function getRoleSessionName(string $role): string {
    switch ($role) {
        case 'staff':              return 'STAFF_SESSION';
        case 'supervisor':         return 'SUPERVISOR_SESSION';
        case 'admin':              return 'ADMIN_SESSION';
        case 'president':
        case 'executive_director': return 'EXEC_SESSION';
        default:                   return 'APP_SESSION';
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$email = isset($_POST['email']) ? trim($_POST['email']) : '';
	$password = isset($_POST['password']) ? $_POST['password'] : '';

	if (empty($email) || empty($password)) {
		$error = 'Please enter both email and password.';
	} else {
		// Prepare and execute query
		$stmt = $conn->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
		$stmt->bindParam(':email', $email);
		$stmt->execute();
		$user = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($user && password_verify($password, $user['password'])) {
			// Start the role-specific named session before setting variables.
			session_name(getRoleSessionName($user['role']));
			session_start();
			session_regenerate_id(true);

			// Set session variables
			$_SESSION['user_id'] = $user['id'];
			$_SESSION['email'] = $user['email'];
			$_SESSION['role'] = $user['role'];

			require_once '../../config/presence.php';
			markUserActive($conn, (int) $user['id']);

			require_once '../../config/log_activity.php';
			logActivity($conn, 'auth.login', 'user', (int)$user['id'],
				"Login successful: {$user['name']} ({$user['email']})");

			// Redirect based on role
			switch ($user['role']) {
				case 'admin':
					header('Location: ../../admin/dashboard.html');
					break;
				case 'executive_director':
					header('Location: ../../pres_exec/dashboard.html');
					break;
				case 'president':
					header('Location: ../../pres_exec/dashboard.html');
					break;
				case 'supervisor':
					header('Location: ../../supervisor/dashboard.html');
					break;
				case 'staff':
					header('Location: ../../staff/dashboard.html');
					break;
				default:
					header('Location: ../../auth/login.html');
					break;
			}
			exit();
		} else {
			$error = 'Invalid email or password.';

			// Log failed attempt (no session yet — write directly)
			require_once '../../config/log_activity.php';
			try {
				$ins = $conn->prepare("
					INSERT INTO activity_logs (user_id, user_name, role, action, target_type, description)
					VALUES (0, ?, '', 'auth.login_failed', 'user', ?)
				");
				$ins->execute([
					$email,
					"Failed login attempt for: {$email}",
				]);
			} catch (Throwable $e) {
				error_log('[activity_log] ' . $e->getMessage());
			}
		}
	}
}

// If error, show error and link back to login
if (isset($error)) {
	echo '<!DOCTYPE html><html><head><title>Login Error</title></head><body>';
	echo '<h3 style="color:red;">' . htmlspecialchars($error) . '</h3>';
	echo '<a href="../login.html">Back to Login</a>';
	echo '</body></html>';
	exit();
}
