<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once '../../config/db.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request']);
    exit();
}

function requestValue(array $source, string $key, string $default = ''): string
{
    return isset($source[$key]) ? trim((string) $source[$key]) : $default;
}

$payload = json_decode(file_get_contents('php://input'), true) ?: [];

$required = ['name', 'email', 'password', 'employee_id'];
foreach ($required as $field) {
    if (requestValue($payload, $field) === '') {
        http_response_code(422);
        echo json_encode(['error' => 'Missing required field: ' . $field]);
        exit();
    }
}

$name = requestValue($payload, 'name');
$email = requestValue($payload, 'email');
$passwordHash = password_hash(requestValue($payload, 'password'), PASSWORD_DEFAULT);
$employeeId = requestValue($payload, 'employee_id');
$departmentId = 0;

try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not logged in']);
        exit();
    }

    $supervisorId = (int) $_SESSION['user_id'];
    $supervisorStmt = $conn->prepare('SELECT department_id FROM users WHERE id = :id LIMIT 1');
    $supervisorStmt->bindValue(':id', $supervisorId, PDO::PARAM_INT);
    $supervisorStmt->execute();
    $supervisor = $supervisorStmt->fetch(PDO::FETCH_ASSOC);

    $departmentId = (int) ($supervisor['department_id'] ?? 0);
    if ($departmentId <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'Supervisor department was not found']);
        exit();
    }

    $stmt = $conn->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already exists']);
        exit();
    }

    $employeeStmt = $conn->prepare('SELECT id FROM users WHERE employee_id = :employee_id LIMIT 1');
    $employeeStmt->bindParam(':employee_id', $employeeId);
    $employeeStmt->execute();

    if ($employeeStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Employee ID already exists']);
        exit();
    }

    $insert = $conn->prepare('
        INSERT INTO users (
            name,
            email,
            password,
            role,
            department_id,
            employee_id,
            is_active
        ) VALUES (
            :name,
            :email,
            :password,
            "staff",
            :department_id,
            :employee_id,
            1
        )
    ');

    $insert->bindValue(':name', $name, PDO::PARAM_STR);
    $insert->bindValue(':email', $email, PDO::PARAM_STR);
    $insert->bindValue(':password', $passwordHash, PDO::PARAM_STR);
    $insert->bindValue(':department_id', $departmentId, PDO::PARAM_INT);
    $insert->bindValue(':employee_id', $employeeId, PDO::PARAM_STR);
    $insert->execute();

    echo json_encode([
        'success' => true,
        'id' => (int) $conn->lastInsertId()
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage() ?: 'Database error']);
}
