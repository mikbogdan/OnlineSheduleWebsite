<?php
// header('Access-Control-Allow-Origin: http://localhost:1234');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit();
}

$config = require '../config/db.php';

$pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}",
        $config['username'],
        $config['password'] ?? '',
        $config['options'] ?? []
    );
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$old_password = $_POST['old_password'] ?? '';
$new_password = $_POST['new_password'] ?? '';

if (empty($old_password) || empty($new_password)) {
    echo json_encode(['success' => false, 'message' => 'Заполните все поля']);
    exit();
}

$stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = :id");
$stmt->execute([':id' => $_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !password_verify($old_password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Старый пароль неверный']);
    exit();
}

$hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("UPDATE users SET password_hash = :hash WHERE user_id = :id");
$stmt->execute([':hash' => $hash, ':id' => $_SESSION['user_id']]);

echo json_encode(['success' => true, 'message' => 'Пароль изменён']);
?>