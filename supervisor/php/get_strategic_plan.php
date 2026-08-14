<?php
require_once __DIR__ . '/_auth.php';
/**
 * GET /php/get_strategic_plan.php?id=<planId>
 *
 * Returns the strategic plan and its goals as JSON.
 * Consumed by the React preview component (StrategicPlanPreview.jsx).
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // tighten in production

require_once '../../config/db.php';
date_default_timezone_set('Asia/Manila');

// ── Validate ID ───────────────────────────────────────────────────────────────
$planId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($planId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid plan ID.']);
    exit;
}

// ── Fetch plan ────────────────────────────────────────────────────────────────
$planStmt = $conn->prepare("
    SELECT id, plan_title, department, vision, mission,
           prepared_by, prepared_by_title,
           noted_by_exec_dir, noted_by_president,
           created_at
    FROM strategic_plans
    WHERE id = ?
");
$planStmt->execute([$planId]);
$plan = $planStmt->fetch(PDO::FETCH_ASSOC);

if (!$plan) {
    http_response_code(404);
    echo json_encode(['error' => 'Strategic plan not found.']);
    exit;
}

// ── Fetch goals ───────────────────────────────────────────────────────────────
$goalsStmt = $conn->prepare("
    SELECT id, sort_order, goal, objectives, plans,
           timeline, personnel, metric, remarks
    FROM strategic_plan_goals
    WHERE plan_id = ?
    ORDER BY sort_order ASC, id ASC
");
$goalsStmt->execute([$planId]);
$goals = $goalsStmt->fetchAll(PDO::FETCH_ASSOC);

// Parse JSON plans column for each goal
foreach ($goals as &$g) {
    $g['plans'] = json_decode($g['plans'] ?? '[]', true) ?? [];
}
unset($g);

// ── Build response ────────────────────────────────────────────────────────────
$response = [
    'id'                  => (int) $plan['id'],
    'plan_title'          => $plan['plan_title'],
    'department'          => $plan['department'],
    'vision'              => $plan['vision'],
    'mission'             => $plan['mission'],
    'prepared_by'         => $plan['prepared_by'],
    'prepared_by_title'   => $plan['prepared_by_title']  ?? '',
    'noted_by_exec_dir'   => $plan['noted_by_exec_dir']  ?? '',
    'noted_by_president'  => $plan['noted_by_president'] ?? '',
    'created_at'          => $plan['created_at'],
    'goals'            => array_map(fn($g) => [
        'id'         => (int) $g['id'],
        'goal'       => $g['goal'],
        'objectives' => $g['objectives'] ?? '',
        'plans'      => $g['plans'],
        'timeline'   => $g['timeline']   ?? '',
        'personnel'  => $g['personnel']  ?? '',
        'metric'     => $g['metric']     ?? '',
        'remarks'    => $g['remarks']    ?? '',
    ], $goals),
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);