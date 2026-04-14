<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once '../../config/db.php';

function getInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $parts = array_filter($parts);

    if (empty($parts)) {
        return 'U';
    }

    $initials = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials ?: 'U';
}

function getProfileImageUrl(?string $profileImage): ?string
{
    $profileImage = trim((string)$profileImage);

    if ($profileImage === '') {
        return null;
    }

    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/');

    return $basePath . '/uploads/profiles/' . rawurlencode($profileImage);
}

function respondProfile(PDO $conn, int $userId, string $message = 'Profile updated successfully'): void
{
    $stmt = $conn->prepare("
        SELECT
            u.id,
            u.name,
            u.nickname,
            u.email,
            u.contact,
            u.address,
            u.profile_image,
            u.department_id,
            u.role,
            u.gender,
            u.date_of_birth,
            u.employee_id,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $row['profile_image_url'] = getProfileImageUrl($row['profile_image'] ?? null);
    $row['initials'] = getInitials($row['name'] ?? '');

    echo json_encode([
        'success' => $message,
        'profile' => $row
    ]);
    exit;
}

try {
    $userId = (int) $_SESSION['user_id'];

    $stmt = $conn->prepare("SELECT profile_image FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingUser) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $nickname = isset($_POST['nickname']) ? trim($_POST['nickname']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $contact = isset($_POST['contact']) ? trim($_POST['contact']) : '';
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    $gender = isset($_POST['gender']) ? trim($_POST['gender']) : '';
    $dateOfBirth = isset($_POST['date_of_birth']) ? trim($_POST['date_of_birth']) : '';

    if ($name === '' || $email === '') {
        http_response_code(422);
        echo json_encode(['error' => 'Name and email are required.']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['error' => 'Please enter a valid email address.']);
        exit;
    }

    if ($contact !== '' && !preg_match('/^\+639\d{9}$/', $contact)) {
        http_response_code(422);
        echo json_encode(['error' => 'Please enter a valid Philippine mobile number.']);
        exit;
    }

    $allowedGenders = ['Male', 'Female', 'Rather not say'];
    if ($gender !== '' && !in_array($gender, $allowedGenders, true)) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid gender selected.']);
        exit;
    }

    if ($dateOfBirth !== '') {
        $date = DateTime::createFromFormat('Y-m-d', $dateOfBirth);
        if (!$date || $date->format('Y-m-d') !== $dateOfBirth) {
            http_response_code(422);
            echo json_encode(['error' => 'Invalid date of birth.']);
            exit;
        }
    }

    $removeProfileImage = isset($_POST['remove_profile_image']) && $_POST['remove_profile_image'] === '1';
    $profileImageFilename = $existingUser['profile_image'] ?? null;

    $uploadDir = dirname(__DIR__, 2) . '/uploads/profiles/';

    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create upload directory.']);
        exit;
    }

    if (!is_writable($uploadDir)) {
        http_response_code(500);
        echo json_encode(['error' => 'Upload directory is not writable.']);
        exit;
    }

    if ($removeProfileImage && !empty($profileImageFilename)) {
        $oldFile = $uploadDir . $profileImageFilename;
        if (is_file($oldFile)) {
            @unlink($oldFile);
        }
        $profileImageFilename = null;
    }

    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($_FILES['profile_image']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(422);
            echo json_encode(['error' => 'Failed to upload profile image.']);
            exit;
        }

        if ($_FILES['profile_image']['size'] > 15 * 1024 * 1024) {
            http_response_code(422);
            echo json_encode(['error' => 'Profile image must be 15MB or smaller.']);
            exit;
        }

        $imageInfo = @getimagesize($_FILES['profile_image']['tmp_name']);
        if ($imageInfo === false) {
            http_response_code(422);
            echo json_encode(['error' => 'Uploaded file is not a valid image.']);
            exit;
        }

        $allowedMimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp'
        ];

        $mimeType = $imageInfo['mime'] ?? '';
        if (!isset($allowedMimeTypes[$mimeType])) {
            http_response_code(422);
            echo json_encode(['error' => 'Only JPG, PNG, and WEBP images are allowed.']);
            exit;
        }

        $extension = $allowedMimeTypes[$mimeType];
        $newFilename = 'user_' . $userId . '_' . time() . '.' . $extension;
        $destination = $uploadDir . $newFilename;

        if (!move_uploaded_file($_FILES['profile_image']['tmp_name'], $destination)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save uploaded image.']);
            exit;
        }

        if (!empty($profileImageFilename) && $profileImageFilename !== $newFilename) {
            $oldFile = $uploadDir . $profileImageFilename;
            if (is_file($oldFile)) {
                @unlink($oldFile);
            }
        }

        $profileImageFilename = $newFilename;
    }

    $nicknameValue = ($nickname === '') ? null : $nickname;
    $contactValue = ($contact === '') ? null : $contact;
    $addressValue = ($address === '') ? null : $address;
    $genderValue = ($gender === '') ? null : $gender;
    $dateOfBirthValue = ($dateOfBirth === '') ? null : $dateOfBirth;

    $update = $conn->prepare("
        UPDATE users
        SET
            name = :name,
            nickname = :nickname,
            email = :email,
            contact = :contact,
            address = :address,
            gender = :gender,
            date_of_birth = :date_of_birth,
            profile_image = :profile_image
        WHERE id = :id
        LIMIT 1
    ");

    $update->bindValue(':name', $name, PDO::PARAM_STR);
    $update->bindValue(':nickname', $nicknameValue, $nicknameValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':email', $email, PDO::PARAM_STR);
    $update->bindValue(':contact', $contactValue, $contactValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':address', $addressValue, $addressValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':gender', $genderValue, $genderValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':date_of_birth', $dateOfBirthValue, $dateOfBirthValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':profile_image', $profileImageFilename, $profileImageFilename === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $update->bindValue(':id', $userId, PDO::PARAM_INT);
    $update->execute();

    respondProfile($conn, $userId);

} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(422);
        echo json_encode(['error' => 'That email address is already in use.']);
        exit;
    }

    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit;
}