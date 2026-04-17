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

    // === GET ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $branch = trim($_GET['branch'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $limit = (int)($_GET['limit'] ?? 100); // всегда ≤ 10

        // Если ничего не передано — возвращаем пустой массив
        if ($branch === '' && $search === '') {
            echo json_encode([
                'success' => true,
                'data' => []
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Условия WHERE
        $where = [];
        $params = [];

        if ($branch !== '') {
            $where[] = "branches LIKE :branch";
            $params[':branch'] = "%$branch%";
        }

        if ($search !== '') {
            $where[] = "full_name LIKE :search";
            $params[':search'] = "%$search%";
        }

        // Если нет ни одного условия — возвращаем пустой результат
        if (empty($where)) {
            echo json_encode([
                'success' => true,
                'data' => []
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Запрос
        $sql = "SELECT id, full_name 
                FROM teachers 
                WHERE " . implode(" AND ", $where) . " 
                ORDER BY id
                LIMIT :limit";

        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

        $stmt->execute();

        $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Ответ
        echo json_encode([
            'success' => true,
            'data' => $teachers
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // ─────── POST — добавление педагога ───────
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Логируем, что пришло (временно — потом уберёшь)
        file_put_contents('debug.log', date('Y-m-d H:i:s') . " POST data: " . print_r($input, true) . PHP_EOL, FILE_APPEND);

        if (empty($input['full_name'])) {
            echo json_encode(['success' => false, 'message' => 'ФИО обязательно']);
            exit();
        }

        try {
            // Убираем id — он AUTO_INCREMENT
            $sql = "INSERT INTO teachers 
                    (full_name, avatar, sex, DOB, contacts, description, branches) 
                    VALUES 
                    (:full_name, :avatar, :sex, :DOB, :contacts, :description, :branches)";

            $stmt = $pdo->prepare($sql);

            $stmt->execute([
                ':full_name'     => $input['full_name'],
                ':avatar'        => $input['avatar'] ?? null,
                ':sex'           => $input['sex'] ?? null,
                ':DOB'           => $input['DOB'] ?? null,
                ':contacts'      => $input['contacts'] ?? null,
                ':description'   => $input['description'] ?? null,
                ':branches'      => $input['branches'] ?? null
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Педагог добавлен',
                'id' => $pdo->lastInsertId()
            ]);

        } catch (PDOException $e) {
            // Вот здесь ты увидишь настоящую ошибку!
            file_put_contents('debug.log', date('Y-m-d H:i:s') . " SQL Error: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
            echo json_encode(['success' => false, 'message' => 'SQL ошибка: ' . $e->getMessage()]);
        }
        exit();
    }

    // ─────── PUT — обновление педагога ───────
    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'update')) {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? $_GET['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID обязателен']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE teachers SET 
                full_name = ?, avatar = ?, sex = ?, DOB = ?, 
                contacts = ?, description = ?, branches = ?
                WHERE id = ?");

            $stmt->execute([
                $input['full_name'] ?? '',
                $input['avatar'] ?? null,
                $input['sex'] ?? null,
                $input['DOB'] ?? null,
                $input['contacts'] ?? null,
                $input['description'] ?? null,
                $input['branches'] ?? null,
                $id
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Педагог обновлён'
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка: ' . $e->getMessage()]);
        }
        exit();
    }

    // ─────── DELETE — удаление педагога ───────
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete')) {
        
        // Получаем ID из URL: /teachers.php?action=delete&id=12
        $id = $_GET['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID не указан']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM teachers WHERE id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Педагог удалён']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Педагог не найден']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка удаления']);
        }
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}