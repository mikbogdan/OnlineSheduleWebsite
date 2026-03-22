<?php
// update-user.php
header('Access-Control-Allow-Origin: http://localhost:1234');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

if ($_SESSION['role'] !== 'superadmin') {
    echo json_encode(['success' => false, 'message' => 'Доступ запрещён']);
    exit();
}

$user_id = $_POST['user_id'] ?? 0;
$role = $_POST['role'] ?? 'student';
$branches = $_POST['branches'] ?? '';
$t_id = $_POST['t_id'] ?? null;

if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Неверный ID']);
    exit();
}

$config = require '../config/db.php';

$pdo = new PDO("mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4", $config['username']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->prepare("UPDATE users SET role = :role, branches = :branches, t_id = :teacher_id WHERE user_id = :id");
$stmt->execute([
    ':role' => $role,
    ':branches' => $branches,
    ':teacher_id' => $t_id,
    ':id' => $user_id
]);

echo json_encode(['success' => true]);
?>