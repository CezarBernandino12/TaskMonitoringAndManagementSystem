<?php

// ── ERROR HANDLER ────────────────────────────────────────────────────
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
set_exception_handler(function ($e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
});
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => $e['message']]);
    }
});

require_once '../../config/db.php';
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$createdBy = $_SESSION['user_id'] ?? null;

// ── INPUT ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body.']);
    exit;
}

// ── VALIDATE REQUIRED FIELDS ─────────────────────────────────────────
$planTitle        = trim($body['plan_title']           ?? '');
$department       = trim($body['department']            ?? '');
$vision           = trim($body['vision']                ?? '');
$mission          = trim($body['mission']               ?? '');
$preparedBy       = trim($body['prepared_by']           ?? '');
$preparedByTitle  = trim($body['prepared_by_title']     ?? '');
$notedByExecDir   = trim($body['noted_by_exec_dir']     ?? '');
$notedByPresident = trim($body['noted_by_president']    ?? '');
$planIdInput      = isset($body['plan_id']) ? (int)$body['plan_id'] : 0;
$goalsInput       = $body['goals'] ?? [];

$errors = [];
if ($planTitle        === '') $errors[] = 'plan_title is required.';
if ($department       === '') $errors[] = 'department is required.';
if ($vision           === '') $errors[] = 'vision is required.';
if ($mission          === '') $errors[] = 'mission is required.';
if ($preparedBy       === '') $errors[] = 'prepared_by is required.';
if ($notedByExecDir   === '') $errors[] = 'noted_by_exec_dir is required.';
if ($notedByPresident === '') $errors[] = 'noted_by_president is required.';
if (!is_array($goalsInput) || count($goalsInput) === 0) $errors[] = 'At least one goal is required.';

if ($errors) {
    http_response_code(422);
    echo json_encode(['error' => implode(' ', $errors)]);
    exit;
}

// Validate each goal
foreach ($goalsInput as $i => $g) {
    $goalTitle = trim($g['goal'] ?? '');
    if ($goalTitle === '') {
        $errors[] = "Goal " . ($i + 1) . " must have a title.";
    }
    $plans = $g['plans'] ?? [];
    if (!is_array($plans)) {
        $errors[] = "Goal " . ($i + 1) . " plans must be an array.";
    }
}
if ($errors) {
    http_response_code(422);
    echo json_encode(['error' => implode(' ', $errors)]);
    exit;
}

// ── SAVE ─────────────────────────────────────────────────────────────
$conn->beginTransaction();

try {
    $isEdit = $planIdInput > 0;

    if ($isEdit) {
        // ── UPDATE existing plan header ───────────────────────────
        $planStmt = $conn->prepare("
            UPDATE strategic_plans
            SET plan_title          = ?,
                department          = ?,
                vision              = ?,
                mission             = ?,
                prepared_by         = ?,
                prepared_by_title   = ?,
                noted_by_exec_dir   = ?,
                noted_by_president  = ?
            WHERE id = ?
        ");
        $planStmt->execute([
            $planTitle, $department, $vision, $mission,
            $preparedBy, $preparedByTitle ?: null,
            $notedByExecDir ?: null, $notedByPresident ?: null,
            $planIdInput,
        ]);
        $planId = $planIdInput;

        // Delete old goals and re-insert (simplest safe strategy)
        $conn->prepare("DELETE FROM strategic_plan_goals WHERE plan_id = ?")->execute([$planId]);

    } else {
        // ── INSERT new plan header ────────────────────────────────
        $planStmt = $conn->prepare("
            INSERT INTO strategic_plans
                (plan_title, department, vision, mission,
                 prepared_by, prepared_by_title,
                 noted_by_exec_dir, noted_by_president,
                 created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $planStmt->execute([
            $planTitle, $department, $vision, $mission,
            $preparedBy, $preparedByTitle ?: null,
            $notedByExecDir ?: null, $notedByPresident ?: null,
            $createdBy,
        ]);
        $planId = (int)$conn->lastInsertId();
    }

    // ── Insert goals ──────────────────────────────────────────────
    $goalStmt = $conn->prepare("
        INSERT INTO strategic_plan_goals
            (plan_id, sort_order, goal, objectives, plans, timeline, personnel, metric, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($goalsInput as $i => $g) {
        // Filter empty plan steps so we don't store blank strings
        $planSteps = array_values(
            array_filter(
                array_map('trim', (array)($g['plans'] ?? [])),
                fn($s) => $s !== ''
            )
        );

        $goalStmt->execute([
            $planId,
            $i,                                          // sort_order
            trim($g['goal']),
            trim($g['objectives'] ?? '') ?: null,
            json_encode($planSteps),                     // JSON array of step strings
            trim($g['timeline']   ?? '') ?: null,
            trim($g['personnel']  ?? '') ?: null,
            trim($g['metric']     ?? '') ?: null,
            trim($g['remarks']    ?? '') ?: null,
        ]);
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'plan_id' => $planId,
        // Redirect URL — adjust path to match your project structure
        'redirect' => "strategic-plan-preview.html?id={$planId}",
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    throw $e;
}