<?php
require_once __DIR__ . '/_auth.php';
require '../../config/db.php';

header('Content-Type: application/json');

$stmt = $conn->query('SELECT id, name FROM departments ORDER BY name');
$departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($departments);