<?php
// Ensure Philippine time
date_default_timezone_set('Asia/Manila');

// Start session
if (session_status() === PHP_SESSION_NONE) { session_start(); }

// Database connection
require_once '../../config/db.php';

// Force JSON output
header('Content-Type: application/json');

// Disable warnings (so they don't break JSON)
ini_set('display_errors', 0);
error_reporting(0);

// Check supervisor session
if (!isset($_SESSION['user_id'])) {
    echo json_encode([]); // return empty array if not logged in
    exit();
}

$supervisor_id = $_SESSION['user_id'];

try {
    // 1️⃣ Get supervisor's department
    $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = :id");
    $stmt->bindParam(':id', $supervisor_id, PDO::PARAM_INT);
    $stmt->execute();
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dept) {
        echo json_encode([]); // no department found
        exit();
    }

    $department_id = $dept['department_id'];

    // 2️⃣ Get all staff in same department
    $stmt = $conn->prepare("
        SELECT id, name
        FROM users
        WHERE department_id = :department_id AND role = 'staff'
    ");
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    $today = date('Y-m-d');

    foreach ($staff as $s) {
        $staff_id = $s['id'];

        // 3️⃣ Get task counts for this staff
        $stmt2 = $conn->prepare("
            SELECT status, COUNT(*) AS cnt
            FROM tasks
            WHERE assigned_to = :staff_id
            GROUP BY status
        ");
        $stmt2->bindParam(':staff_id', $staff_id, PDO::PARAM_INT);
        $stmt2->execute();
        $taskCounts = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $completed = 0;
        $ongoing = 0;
        $total = 0;

        foreach ($taskCounts as $t) {
            $total += $t['cnt'];
            if ($t['status'] === 'Completed') {
                $completed = $t['cnt'];
            } else {
                $ongoing += $t['cnt'];
            }
        }

        // 4️⃣ Count overdue tasks
        $stmt3 = $conn->prepare("
            SELECT COUNT(*) AS overdue_cnt
            FROM tasks
            WHERE assigned_to = :staff_id AND status != 'Completed' AND deadline < :today
        ");
        $stmt3->bindParam(':staff_id', $staff_id, PDO::PARAM_INT);
        $stmt3->bindParam(':today', $today);
        $stmt3->execute();
        $overdueRes = $stmt3->fetch(PDO::FETCH_ASSOC);
        $overdue = $overdueRes['overdue_cnt'] ?? 0;

        $results[] = [
            'id' => $s['id'],
            'name' => $s['name'],
            'total' => $total,
            'completed' => $completed,
            'ongoing' => $ongoing,
            'overdue' => $overdue
        ];
    }

    // 5️⃣ Always return JSON array, even if empty
    echo json_encode($results);

} catch (PDOException $e) {
    // Return empty array on error
    echo json_encode([]);
}