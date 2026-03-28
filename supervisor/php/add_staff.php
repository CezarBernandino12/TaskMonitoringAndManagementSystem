<?php
require_once '../../config/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Invalid request']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

// Required fields
$required = ['name', 'email', 'password', 'department_id'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['error' => 'Missing required field: ' . $field]);
        exit();
    }
}

$name = $data['name'];
$email = $data['email'];
$password = password_hash($data['password'], PASSWORD_DEFAULT);
$department_id = intval($data['department_id']);
$contact = isset($data['contact']) ? $data['contact'] : '';
$address = isset($data['address']) ? $data['address'] : '';

try {
    // Check for duplicate email
    $stmt = $conn->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'Email already exists']);
        exit();
    }
    $stmt = $conn->prepare('INSERT INTO users (name, email, password, role, department_id, contact, address) VALUES (:name, :email, :password, "staff", :department_id, :contact, :address)');
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password', $password);
    $stmt->bindParam(':department_id', $department_id, PDO::PARAM_INT);
    $stmt->bindParam(':contact', $contact);
    $stmt->bindParam(':address', $address);
    $stmt->execute();
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error']);
}
