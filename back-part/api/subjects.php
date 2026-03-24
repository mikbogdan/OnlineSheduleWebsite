<?php
// api/subjects.php

// header('Access-Control-Allow-Origin: http://localhost:1234');
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

    // === GET по одному предмету ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
        $id = (int)$_GET['id'];

        $stmt = $pdo->prepare("
            SELECT id, subject, subject_type, subject_grade, 
                subject_active_bobr, subject_active_minsk, subject_active_brest 
            FROM subjects 
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

    // === GET — получение списка ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $branch = $_GET['branch'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        $sql = "SELECT id, subject, subject_active_bobr, subject_active_minsk, subject_active_brest, subject_type, subject_grade FROM subjects";
        $countSql = "SELECT COUNT(*) as total FROM subjects";
        $params = [];

        $where = [];

        if ($branch !== 'all') {
            $activeField = match ($branch) {
                'Бобруйск' => 'subject_active_bobr',
                'Минск'     => 'subject_active_minsk',
                'Брест'     => 'subject_active_brest',
                default     => 'subject_active_bobr'
            };
            $where[] = "$activeField = 'true'";
        }

        if ($search !== '') {
            $where[] = "subject LIKE :search";
            $params[':search'] = "%$search%";
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
            $countSql .= " WHERE " . implode(" AND ", $where);
        }

        // Считаем общее количество
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Получаем данные с LIMIT и OFFSET
        $sql .= " LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $subjects,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // === ДОБАВЛЕНИЕ НОВОГО ПРЕДМЕТА ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
        $subject = trim($_POST['subject'] ?? '');
        $types = trim($_POST['subject_type'] ?? '');
        $grades = trim($_POST['subject_grade'] ?? '');

        if (empty($subject)) {
            echo json_encode(['success' => false, 'message' => 'Название обязательно']);
            exit();
        }

        $stmt = $pdo->prepare("
            INSERT INTO subjects (subject, subject_type, subject_grade, subject_active_bobr, subject_active_minsk, subject_active_brest)
            VALUES (:subject, :types, :grades, 'true', 'true', 'true')
        ");
        $stmt->execute([
            ':subject' => $subject,
            ':types' => $types,
            ':grades' => $grades
        ]);

        echo json_encode(['success' => true]);
        exit();
    }

    // === POST — обновление предмета ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update') {
        $id = $_POST['id'] ?? null;
        $subject = trim($_POST['subject'] ?? '');
        $subject_type = trim($_POST['subject_type'] ?? '');
        $subject_grade = trim($_POST['subject_grade'] ?? '');

        if (!$id || !is_numeric($id) || empty($subject)) {
            echo json_encode(['success' => false, 'message' => 'Неверные данные']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("
                UPDATE subjects 
                SET subject = :subject, 
                    subject_type = :type, 
                    subject_grade = :grade 
                WHERE id = :id
            ");
            $stmt->execute([
                ':subject' => $subject,
                ':type' => $subject_type,
                ':grade' => $subject_grade,
                ':id' => $id
            ]);

            echo json_encode(['success' => true, 'message' => 'Предмет обновлён']);
        } catch (Exception $e) {
            error_log("Update error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit();
    }

    // === POST — переключение статуса  ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'toggle') {
        $id = $_POST['id'] ?? null;
        $active = $_POST['active'] ?? null;
        $branch = $_POST['branch'] ?? null;

        if (!$id || !is_numeric($id) || $active === null) {
            echo json_encode(['success' => false, 'message' => 'Неверные данные']);
            exit();
        }

        if($branch === 'Бобруйск'){
            try {
            $stmt = $pdo->prepare("UPDATE subjects SET subject_active_bobr = ? WHERE id = ?");
            $stmt->execute([$active ? "true" : "false", $id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit(); 
        }elseif($branch === 'Минск'){
            try {
            $stmt = $pdo->prepare("UPDATE subjects SET subject_active_minsk = ? WHERE id = ?");
            $stmt->execute([$active ? "true" : "false", $id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit();
        }elseif($branch === 'Брест'){
            try {
            $stmt = $pdo->prepare("UPDATE subjects SET subject_active_brest = ? WHERE id = ?");
            $stmt->execute([$active ? "true" : "false", $id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit();
        }
        
    }

    // === DELETE — удаление предмета ===
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? null;

        if (!$id || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'Неверный ID']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Предмет удалён']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Предмет не найден']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Ошибка удаления']);
        }
        exit();
    }
    // Если не GET и не POST с action=toggle — ошибка
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>
