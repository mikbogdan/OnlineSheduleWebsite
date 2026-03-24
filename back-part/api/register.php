<?php
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
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['username']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("DB Connection Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Ошибка подключения к БД']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim($_POST['regLogin'] ?? '');
    $password = $_POST['regPassword'] ?? '';

    if (empty($login) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Заполните логин и пароль']);
        exit();
    }

    // Хэшируем пароль
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // По умолчанию — студент и ближайший филиал (можно улучшить геолокацией)
    $defaultBranch = "Бобруйск";

    try {
        $stmt = $pdo->prepare("
            INSERT INTO users (login, password_hash, role, branches)
            VALUES (:login, :hash, 'student', :branch)
        ");
        $stmt->execute([
            ':login' => $login,
            ':hash' => $hash,
            ':branch' => $defaultBranch
        ]);

        // Автоматический вход после регистрации
        $userId = $pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = 'student';
        $_SESSION['branches'] = $defaultBranch;
        $_SESSION['login'] = $login;

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['success' => false, 'message' => 'Логин уже занят']);
        } else {
            error_log("Register error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
        }
    }
    exit();
}

echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
exit();
?>