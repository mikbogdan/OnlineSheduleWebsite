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
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($query === '') {
        echo json_encode([
            'success' => true,
            'data' => []
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $subjectBranchFieldMap = [
        'Бобруйск' => 'subject_active_bobr',
        'Минск' => 'subject_active_minsk',
        'Брест' => 'subject_active_brest'
    ];

    if (!isset($subjectBranchFieldMap[$branch])) {
        echo json_encode([
            'success' => false,
            'message' => 'Неизвестный филиал для предметов'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $subjectActiveField = $subjectBranchFieldMap[$branch];
    $like = '%' . $query . '%';

    $stmt = $pdo->prepare("
        SELECT id, subject
        FROM subjects
        WHERE {$subjectActiveField} = 'true'
          AND subject LIKE :query
        ORDER BY subject ASC
        LIMIT 10
    ");
    $stmt->execute([
        ':query' => $like
    ]);

    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

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