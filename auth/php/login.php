<?php
session_start();
require_once '../../config/db.php';

ob_start();
include '../../config/db.php';
ob_end_clean();

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
			// Set session variables
			$_SESSION['user_id'] = $user['id'];
			$_SESSION['email'] = $user['email'];
			$_SESSION['role'] = $user['role'];
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
