<?php

header('Access-Control-Allow-Origin: http://localhost:1234');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json; charset=utf-8');

$config = require '../config/db.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['username'],
        $config['password'] ?? ''
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
        $id = (int)$_GET['id'];

        $stmt = $pdo->prepare("
            SELECT id, cabinet, cabinet_color, branch, 
                cabinet_active
            FROM cabinets 
            WHERE id = :id
        ");
        $stmt->execute([':id' => $id]);
        $subject = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($subject) {
            echo json_encode([
                'success' => true,
                'data' => $subject
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Предмет не найден'
            ], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // === GET ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Получаем параметр branch из GET, по умолчанию "Бобруйск"
        $branch = $_GET['branch'] ?? 'Бобруйск';

        // Подготовленный запрос с параметром
        $sql = "SELECT id, cabinet, cabinet_color, branch, cabinet_active 
                FROM cabinets 
                WHERE branch = :branch";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':branch' => $branch]);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Если ничего не найдено — можно вернуть пустой массив (или ошибку, по желанию)
        echo json_encode([
            'success' => true,
            'data' => $subjects
        ], JSON_UNESCAPED_UNICODE);

        exit();
    }

    // === POST — ДОБАВЛЕНИЕ НОВОГО КАБИНЕТА ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'add') {
        $subject = trim($_POST['subject'] ?? '');
        $color = $_POST['color'] ?? '#10709f';
        $branch = trim($_POST['branch'] ?? '');

        if (empty($subject)) {
            echo json_encode(['success' => false, 'message' => 'Название обязательно']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO cabinets (cabinet, cabinet_color, branch, cabinet_active) VALUES (?, ?, ?, 'true')");
            $stmt->execute([$subject, $color, $branch]);

            echo json_encode([
                'success' => true,
                'message' => 'Кабинет добавлен',
                'id' => $pdo->lastInsertId()
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка добавления']);
        }
        exit();
    }

    // === POST — обновление кабинета ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update') {
        $id = $_POST['id'] ?? null;
        $cabinet = trim($_POST['cabinet'] ?? '');
        $cabinet_color = $_POST['cabinet_color'] ?? '#10709f';

        if (!$id || !is_numeric($id) || empty($cabinetц)) {
            echo json_encode(['success' => false, 'message' => 'Неверные данные']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE cabinets SET cabinet = ?, cabinet_color = ? WHERE id = ?");
            $stmt->execute([$cabinet, $cabinet_color, $id]);

            echo json_encode(['success' => true, 'message' => 'Предмет обновлён']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit();
    }

    // === POST — переключение статуса  ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'toggle') {
        $id = $_POST['id'] ?? null;
        $active = $_POST['active'] ?? null;

        if (!$id || !is_numeric($id) || $active === null) {
            echo json_encode(['success' => false, 'message' => 'Неверные данные']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE cabinets SET cabinet_active = ? WHERE id = ?");
            $stmt->execute([$active ? "true" : "false", $id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit();
    }

    // === DELETE — удаление кабинета ===
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'Неверный ID']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM cabinets WHERE id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Кабинет удалён']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Кабинет не найден']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка удаления']);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>