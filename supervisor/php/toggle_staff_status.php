<?php
require_once __DIR__ . '/_auth.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once '../../config/db.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$staffId = isset($data['id']) ? (int) $data['id'] : 0;
$isActive = isset($data['is_active']) ? (int) $data['is_active'] : null;

if ($staffId <= 0 || ($isActive !== 0 && $isActive !== 1)) {
    http_response_code(422);
    echo json_encode(['error' => 'Invalid employee status request']);
    exit();
}

try {
    $supervisorId = (int) $_SESSION['user_id'];

    $supervisorStmt = $conn->prepare('SELECT department_id FROM users WHERE id = :id LIMIT 1');
    $supervisorStmt->bindValue(':id', $supervisorId, PDO::PARAM_INT);
    $supervisorStmt->execute();
    $supervisor = $supervisorStmt->fetch(PDO::FETCH_ASSOC);

    $departmentId = (int) ($supervisor['department_id'] ?? 0);
    if ($departmentId <= 0) {
        http_response_code(403);
        echo json_encode(['error' => 'Supervisor department was not found']);
        exit();
    }

    $update = $conn->prepare('
        UPDATE users
        SET is_active = :is_active
        WHERE id = :id
          AND role = "staff"
          AND department_id = :department_id
    ');
    $update->bindValue(':is_active', $isActive, PDO::PARAM_INT);
    $update->bindValue(':id', $staffId, PDO::PARAM_INT);
    $update->bindValue(':department_id', $departmentId, PDO::PARAM_INT);
    $update->execute();

    if ($update->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Employee was not found']);
        exit();
    }

    echo json_encode([
        'success' => true,
        'id' => $staffId,
        'is_active' => $isActive
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage() ?: 'Database error']);
}
