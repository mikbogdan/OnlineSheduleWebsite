<?php
// check-auth.php

// header('Access-Control-Allow-Origin: http://localhost:1234');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json; charset=utf-8');

require '../config/session.php';

$config = require '../config/db.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}",
        $config['username'],
        $config['password'] ?? '',
        $config['options'] ?? []
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("DB Connection Error in check-auth: " . $e->getMessage());
    echo json_encode(['authenticated' => false, 'message' => 'Ошибка подключения к БД']);
    exit();
}

// Если нет сессии — пользователь не авторизован
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['authenticated' => false]);
    exit();
}

// Дополнительная проверка: существует ли пользователь в БД (защита от поддельной сессии)
try {
    $stmt = $pdo->prepare("SELECT role, branches, login, t_id FROM users WHERE user_id = :id");
    $stmt->execute([':id' => $_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Сессия недействительна — уничтожаем
        session_destroy();
        echo json_encode(['authenticated' => false]);
        exit();
    }

    // Всё ок — возвращаем данные
    echo json_encode([
        'authenticated' => true,
        'role' => $user['role'],
        'branches' => $user['branches'] ?? '',
        'login' => $user['login'],
        't_id' => $user['t_id'] ?? null
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    error_log("Check-auth error: " . $e->getMessage());
    echo json_encode(['authenticated' => false]);
}
exit();
?>