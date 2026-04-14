<?php
/**
 * strategic_plan_history.php
 *
 * Returns all strategic plans whose creator belongs to the same department
 * as the currently logged-in user.
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=UTF-8');

require_once '../../config/db.php'; // provides $conn

// ── Auth check ────────────────────────────────────────────────────────────────
$currentUserId = $_SESSION['user_id'] ?? $_SESSION['id'] ?? null;

if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthenticated.', 'plans' => []]);
    exit;
}

// ── Fetch current user's department ──────────────────────────────────────────
try {
    $stmtUser = $conn->prepare(
        'SELECT id, name, department_id FROM users WHERE id = :id LIMIT 1'
    );
    $stmtUser->execute([':id' => $currentUserId]);
    $currentUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch current user: ' . $e->getMessage(), 'plans' => []]);
    exit;
}

if (!$currentUser || empty($currentUser['department_id'])) {
    echo json_encode(['plans' => []]);
    exit;
}

$currentDept = $currentUser['department_id'];

// ── Fetch department plans ────────────────────────────────────────────────────
try {
    $stmtPlans = $conn->prepare(
        'SELECT
            sp.id,
            sp.plan_title,
            sp.vision,
            sp.mission,
            sp.created_by,
            u.name        AS creator_name,
            u.department_id,
            sp.created_at,
            sp.updated_at
         FROM strategic_plans sp
         INNER JOIN users u ON u.id = sp.created_by
         WHERE u.department_id = :dept
         ORDER BY sp.updated_at DESC, sp.created_at DESC'
    );
    $stmtPlans->execute([':dept' => $currentDept]);
    $plans = $stmtPlans->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch department plans: ' . $e->getMessage(), 'plans' => []]);
    exit;
}

// ── Append preview URL to each plan ──────────────────────────────────────────
foreach ($plans as &$plan) {
    $plan['preview_url'] = 'strategic-plan-preview.html?id=' . (int) $plan['id'];
}
unset($plan);

// ── Return ────────────────────────────────────────────────────────────────────
echo json_encode([
    'plans'      => $plans,
    'department' => $currentDept,
    'total'      => count($plans),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);