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
        $config['username']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // === GET ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];

            $sql = "SELECT * FROM clients WHERE client_ID = :id"; 
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $client = $stmt->fetchAll(PDO::FETCH_ASSOC);

             if ($client) {
                    echo json_encode([
                    'success' => true,
                    'data' => $client
                ], JSON_UNESCAPED_UNICODE);
             }else{
                echo json_encode([
                    'success' => false,
                    'message' => 'Клиент не найден'
                ], JSON_UNESCAPED_UNICODE);
             }
            exit();
        }

        $branch = $_GET['branch'] ?? 'Бобруйск';

        $sql = "SELECT * FROM clients 
                WHERE client_branch LIKE :branch_pattern"; 
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':branch_pattern' => "%$branch%"]);
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $clients
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // ─────── DELETE ───────
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete')) {
        
        $id = $_GET['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID не указан']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM clients WHERE client_id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Клиент удалён']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Клиент не найден']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка удаления']);
        }
        exit();
    }

    // ─────── POST ───────
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['client_name'])) {
            echo json_encode(['success' => false, 'message' => 'ФИО обязательно']);
            exit();
        }

        try {
            // Убираем id — он AUTO_INCREMENT
            $sql = "INSERT INTO clients 
                    (client_name, client_type, client_status, client_contacts, client_comment, client_branch) 
                    VALUES 
                    (:client_name, :client_type, :client_status, :client_contacts, :client_comment, :client_branch)";

            $stmt = $pdo->prepare($sql);

            $stmt->execute([
                ':client_name'     => $input['client_name'],
                ':client_type'        => $input['client_type'] ?? null,
                ':client_status'           => $input['client_status'] ?? null,
                ':client_contacts'      => $input['client_contacts'] ?? null,
                ':client_comment'   => $input['client_comment'] ?? null,
                ':client_branch'      => $input['client_branch'] ?? null
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Клиент добавлен',
                'id' => $pdo->lastInsertId()
            ]);

        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'SQL ошибка: ' . $e->getMessage()]);
        }
        exit();
    }

    // ─────── PUT ───────
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') { 
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)$input['client_ID'] ?? $_GET['client_ID'] ?? null;

        if (empty($input['client_name'])) {
            echo json_encode(['success' => false, 'message' => 'ФИО обязательно']);
            exit();
        }

        try {
            $sql = "UPDATE clients SET
                    client_name = ?, client_type = ?, client_status = ?, 
                    client_contacts = ?, client_comment = ?, client_branch = ?
                    WHERE client_ID = ?";

            $stmt = $pdo->prepare($sql);

            $stmt->execute([
                $input['client_name'],
                $input['client_type'] ?? null,
                $input['client_status'] ?? null,
                $input['client_contacts'] ?? null,
                $input['client_comment'] ?? null,
                $input['client_branch'] ?? null,
                $id
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Клиент обновлён',
                'id' => $pdo->lastInsertId()
            ]);

        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'SQL ошибка: ' . $e->getMessage()]);
        }
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>    