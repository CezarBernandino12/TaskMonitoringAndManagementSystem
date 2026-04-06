<?php
// ====================================================================
// save_user.php
// Creates a new user or updates an existing one.
//
// Expects JSON body matching the users table fields.
// If `id` is present and non-zero → UPDATE, otherwise → INSERT.
//
// Password: required on INSERT. On UPDATE, only re-hashed if provided.
//
// Returns: { user: { ...full user row } }
// ====================================================================
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});

require '../../config/db.php';
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');

session_start();
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated.']);
    exit;
}

// ----------------------------------------------------------------
// Only admin can manage users (adjust if needed)
// ----------------------------------------------------------------
// Uncomment to enforce role restriction:
// $callerStmt = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
// $callerStmt->execute([$_SESSION['user_id']]);
// $caller = $callerStmt->fetch(PDO::FETCH_ASSOC);
// if (!$caller || $caller['role'] !== 'admin') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Only administrators can manage users.']);
//     exit;
// }

// ----------------------------------------------------------------
// Parse + sanitise input
// ----------------------------------------------------------------
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input.']);
    exit;
}

$id             = !empty($input['id']) ? (int)$input['id'] : null;
$name           = trim($input['name'] ?? '');
$nickname       = trim($input['nickname']       ?? '') ?: null;
$email          = strtolower(trim($input['email'] ?? ''));
$password       = $input['password'] ?? '';
$role           = $input['role']     ?? 'staff';
$contact        = isset($input['contact']) && $input['contact'] !== '' ? (int)$input['contact'] : null;
$address        = trim($input['address']         ?? '') ?: null;
$gender         = $input['gender']               ?? null;
$dateOfBirth    = $input['date_of_birth']        ?? null;
$isActive       = isset($input['is_active'])     ? (int)$input['is_active']     : 1;
$departmentId   = !empty($input['department_id'])? (int)$input['department_id'] : null;
$employeeId     = trim($input['employee_id']     ?? '') ?: null;

// ----------------------------------------------------------------
// Validation
// ----------------------------------------------------------------
$allowedRoles   = ['admin','supervisor','staff','executive_director','president'];
$allowedGenders = ['Male','Female','Rather not say', null, ''];

if ($name === '') { http_response_code(400); echo json_encode(['error' => 'name is required.']); exit; }
if ($email     === '') { http_response_code(400); echo json_encode(['error' => 'email is required.']); exit; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['error' => 'Invalid email address.']); exit; }
if (!in_array($role, $allowedRoles, true)) { http_response_code(400); echo json_encode(['error' => 'Invalid role.']); exit; }
if (!$id && $password === '') { http_response_code(400); echo json_encode(['error' => 'Password is required for new users.']); exit; }
if ($password !== '' && strlen($password) < 6) { http_response_code(400); echo json_encode(['error' => 'Password must be at least 6 characters.']); exit; }

// Email uniqueness check
$emailCheckSql = $id
    ? "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1"
    : "SELECT id FROM users WHERE email = ? LIMIT 1";
$emailParams   = $id ? [$email, $id] : [$email];
$emailStmt     = $conn->prepare($emailCheckSql);
$emailStmt->execute($emailParams);
if ($emailStmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This email address is already in use.']);
    exit;
}

// Employee ID uniqueness (if provided)
if ($employeeId) {
    $empIdSql    = $id
        ? "SELECT id FROM users WHERE employee_id = ? AND id != ? LIMIT 1"
        : "SELECT id FROM users WHERE employee_id = ? LIMIT 1";
    $empIdParams = $id ? [$employeeId, $id] : [$employeeId];
    $empIdStmt   = $conn->prepare($empIdSql);
    $empIdStmt->execute($empIdParams);
    if ($empIdStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'This Employee ID is already assigned to another user.']);
        exit;
    }
}

// Validate department exists
if ($departmentId) {
    $deptStmt = $conn->prepare("SELECT id FROM departments WHERE id = ? LIMIT 1");
    $deptStmt->execute([$departmentId]);
    if (!$deptStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid department_id.']);
        exit;
    }
}

// Resolve department name for denormalised column
$departmentName = null;
if ($departmentId) {
    $deptNameStmt = $conn->prepare("SELECT name FROM departments WHERE id = ? LIMIT 1");
    $deptNameStmt->execute([$departmentId]);
    $deptRow = $deptNameStmt->fetch(PDO::FETCH_ASSOC);
    $departmentName = $deptRow ? $deptRow['name'] : null;
}



$now = date('Y-m-d H:i:s');

// ----------------------------------------------------------------
// Persist
// ----------------------------------------------------------------
if ($id) {
    // ── UPDATE ──────────────────────────────────────────────────
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    $sql    = "
        UPDATE users SET
            name            = ?,
            nickname        = ?,
            email           = ?,
            role            = ?,
            contact         = ?,
            address         = ?,
            gender          = ?,
            date_of_birth   = ?,
            is_active       = ?,
            department      = ?,
            department_id   = ?,
            employee_id     = ?,
            updated_at      = ?
    ";
    $params = [
        $name, $nickname,
        $email, $role, $contact, $address, $gender ?: null,
        $dateOfBirth ?: null, $isActive,
        $departmentName, $departmentId, $employeeId, $now,
    ];

    if ($password !== '') {
        $sql      .= ", password = ?";
        $params[]  = password_hash($password, PASSWORD_BCRYPT);
    }

    $sql     .= " WHERE id = ?";
    $params[] = $id;

    $conn->prepare($sql)->execute($params);

} else {
    // ── INSERT ──────────────────────────────────────────────────
    $hashedPw = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $conn->prepare("
        INSERT INTO users
            (name, nickname, email, password,
             role, contact, address, gender, date_of_birth, is_active,
             department, department_id, employee_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $name, $nickname, $email, $hashedPw, $role, $contact, $address,
        $gender ?: null, $dateOfBirth ?: null, $isActive,
        $departmentName, $departmentId, $employeeId, $now, $now,
    ]);
    $id = (int)$conn->lastInsertId();
}

// ----------------------------------------------------------------
// Return the saved user (re-fetch to get all columns cleanly)
// ----------------------------------------------------------------
$fetchStmt = $conn->prepare("
    SELECT u.*, COALESCE(d.name, u.department) AS department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ? LIMIT 1
");
$fetchStmt->execute([$id]);
$saved = $fetchStmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'user' => [
        'id'             => (int)$saved['id'],
        'name'           => $saved['name'],
        'nickname'       => $saved['nickname'],
        'email'          => $saved['email'],
        'role'           => $saved['role'],
        'contact'        => $saved['contact'],
        'address'        => $saved['address'],
        'gender'         => $saved['gender'],
        'date_of_birth'  => $saved['date_of_birth'],
        'is_active'      => (int)$saved['is_active'],
        'department'     => $saved['department_name'] ?? $saved['department'],
        'department_id'  => $saved['department_id'] ? (int)$saved['department_id'] : null,
        'employee_id'    => $saved['employee_id'],
        'profile_image'  => $saved['profile_image'],
        'created_at'     => $saved['created_at'],
        'updated_at'     => $saved['updated_at'],
    ],
]);
