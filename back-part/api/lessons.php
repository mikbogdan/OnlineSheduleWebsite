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

        // 1. Запрос одного урока по ID (без изменений)
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];

            $sql = "SELECT 
                        l.*,
                        c.cabinet AS cabinet_name
                    FROM lessons l
                    LEFT JOIN cabinets c ON l.lesson_cabinet = c.id
                    WHERE l.lesson_id = :id";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $lesson = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($lesson) {
                echo json_encode([
                    'success' => true,
                    'data' => $lesson
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Урок не найден'
                ], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }

        $branch = $_GET['branch'] ?? 'Бобруйск';
        $teacher_id = isset($_GET['teacher_id']) ? (int)$_GET['teacher_id'] : null;
        $date = $_GET['date'] ?? null;
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;
        $type = $_GET['type'] ?? null;
        $teacher_name = $_GET['teacher'] ?? '';
        
        if ($teacher_id) {
            $tStmt = $pdo->prepare("SELECT full_name FROM teachers WHERE id = :id");
            $tStmt->execute([':id' => $teacher_id]);
            $teacher = $tStmt->fetch(PDO::FETCH_ASSOC);

            if ($teacher && !empty($teacher['full_name'])) {
                $teacher_name = $teacher['full_name'];
            } else {
                // Если преподаватель не найден — можно вернуть ошибку или пустой результат
                echo json_encode([
                    'success' => false,
                    'message' => 'Преподаватель не найден'
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }
        }

        // Базовый SELECT
      $sql = "
            SELECT 
                l.*,
                c.cabinet AS cabinet_name
            FROM lessons l
            LEFT JOIN cabinets c ON l.lesson_cabinet = c.id
        ";

        // Массивы для условий и параметров
        $where = [];
        $params = [];   

        // 1. Фильтр по филиалу (обязательный)
        $where[] = "l.lesson_branch = :branch";
        $params[':branch'] = $branch;
    
        // 2. Фильтр по преподавателю (если передан)
        if ($teacher_name !== '') {
            $where[] = "FIND_IN_SET(:teacher_name, l.lesson_teacher)";
            $params[':teacher_name'] = $teacher_name;
        }

        // 3. Фильтр по одной дате
        if ($date) {
            $where[] = "l.lesson_data = :date";
            $params[':date'] = $date;
        } 
        // 4. Фильтр по диапазону дат
        elseif ($start && $end) {
            $where[] = "l.lesson_data BETWEEN :start AND :end";
            $params[':start'] = $start;
            $params[':end'] = $end;
        }

        // 5. Фильтр по типу урока (trial, group, individual)
        if ($type) {
            $types = explode(',', $type);
            $types = array_map('trim', $types);
            $types = array_filter($types);

            if (!empty($types)) {
                $typePlaceholders = [];
                foreach ($types as $i => $t) {
                    $placeholder = ":type{$i}";
                    $typePlaceholders[] = $placeholder;
                    $params[$placeholder] = $t;
                }
                $where[] = "l.lesson_type IN (" . implode(', ', $typePlaceholders) . ")";
            }
        }

        // Добавляем WHERE, если есть условия
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        // Сортировка
        $sql .= " ORDER BY l.lesson_data, l.lesson_start";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $lessons
            ], JSON_UNESCAPED_UNICODE);
        } catch (PDOException $e) {
            error_log("Ошибка в lessons.php: " . $e->getMessage());
            echo json_encode([
                'success' => false,
                'message' => 'Ошибка базы данных: ' . $e->getMessage() // для отладки
            ], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // === ДОБАВЛЕНИЕ УРОКА ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
        $date = $_POST['date'] ?? '';
        $type = $_POST['type'] ?? 'group';
        $name = trim($_POST['name'] ?? '');
        $start = $_POST['start'] ?? '';
        $end = $_POST['end'] ?? '';
        $cabinet_id = $_POST['cabinet_id'] ?? null;
        $teacher = trim($_POST['teacher'] ?? '');
        $comment = trim($_POST['comment'] ?? '');
        $clients = trim($_POST['client'] ?? '');
        $contract_number = trim($_POST['contract_number'] ?? '');
        $branch = $_POST['branch'] ?? 'Бобруйск';

        if (empty($date) || empty($name) || empty($start) || empty($end) || empty($cabinet_id)) {
            echo json_encode(['success' => false, 'message' => 'Заполните обязательные поля']);
            exit();
        }

        $stmt = $pdo->prepare("
            INSERT INTO lessons 
            (LESSON_DATA, LESSON_TYPE, LESSON_NAME, LESSON_START, LESSON_END, LESSON_CABINET, LESSON_TEACHER, LESSON_COMMENT, LESSON_BRANCH, LESSON_CLIENTS, LESSON_CONTRACT) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$date, $type, $name, $start, $end, $cabinet_id, $teacher, $comment ?: null, $branch, $clients, $contract_number ]);

        echo json_encode(['success' => true, 'message' => 'Урок добавлен']);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'delete') {
        $id = (int)$_POST['id'];

        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Неверный ID']);
            exit();
        }

        try {
            $sql = "DELETE FROM lessons WHERE lesson_id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Урок не найден']);
            }
        } catch (PDOException $e) {
            error_log("Delete error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Ошибка удаления']);
        }
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'update') {
        $id = (int)$_POST['id'];
        $date = $_POST['date'];
        $type = $_POST['type'];
        $name = $_POST['name'];
        $start = $_POST['start'];
        $end = $_POST['end'];
        $cabinet_id = (int)$_POST['cabinet_id'];
        $teacher = $_POST['teachers'];
        $comment = $_POST['comment'];
        $contract_number = $_POST['contract_number'];
        $clients = $_POST['clients'];

        $sql = "UPDATE lessons SET 
                    lesson_data = :date,
                    lesson_type = :type,
                    lesson_name = :name,
                    lesson_start = :start,
                    lesson_end = :end,
                    lesson_cabinet = :cabinet_id,
                    lesson_teacher = :teacher,
                    lesson_comment = :comment,
                    lesson_clients = :clients,
                    lesson_contract = :contract_number
                WHERE lesson_id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':date' => $date,
            ':type' => $type,
            ':name' => $name,
            ':start' => $start,
            ':end' => $end,
            ':cabinet_id' => $cabinet_id,
            ':teacher' => $teacher,
            ':comment' => $comment,
            ':id' => $id,
            ':contract_number' => $contract_number,
            ':clients' => $clients,
        ]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Урок не найден или ничего не изменилось']);
        }
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>