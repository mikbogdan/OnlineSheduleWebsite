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
        $config['password'] ?? '',
        $config['options'] ?? []
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode([
            'success' => false,
            'message' => 'Метод не поддерживается'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $branch = isset($_GET['branch']) ? trim($_GET['branch']) : '';
    $archived = isset($_GET['archived']) ? (int)$_GET['archived'] : 0;

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($archived === 1) {
        $dateCondition = "rl.date_to < CURDATE()";
    } else {
        $dateCondition = "rl.date_to >= CURDATE()";
    }

    $stmt = $pdo->prepare("
        SELECT
            rl.id,
            rl.branch,
            rl.weekday,
            rl.lesson_type,
            rl.time_start,
            rl.time_end,
            rl.cabinet_id,
            rl.subject_id,
            rl.subject_name,
            rl.teachers_json,
            rl.date_from,
            rl.date_to,
            c.cabinet AS cabinet_name
        FROM regular_lessons rl
        LEFT JOIN cabinets c ON c.id = rl.cabinet_id
        WHERE rl.branch = :branch
          AND {$dateCondition}
        ORDER BY rl.weekday ASC, rl.time_start ASC, rl.id ASC
    ");
    $stmt->execute([
        ':branch' => $branch
    ]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $data = array_map(function ($row) {
        $teachers = json_decode($row['teachers_json'], true);

        if (!is_array($teachers)) {
            $teachers = [];
        }

        return [
            'id' => (int)$row['id'],
            'branch' => $row['branch'],
            'weekday' => (int)$row['weekday'],
            'lesson_type' => $row['lesson_type'],
            'time_start' => $row['time_start'],
            'time_end' => $row['time_end'],
            'cabinet_id' => (int)$row['cabinet_id'],
            'cabinet_name' => $row['cabinet_name'],
            'subject_id' => (int)$row['subject_id'],
            'subject_name' => $row['subject_name'],
            'teachers' => $teachers,
            'teachers_text' => implode(', ', array_map(function ($teacher) {
                return isset($teacher['label']) ? $teacher['label'] : '';
            }, $teachers)),
            'date_from' => $row['date_from'],
            'date_to' => $row['date_to']
        ];
    }, $rows);

    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}