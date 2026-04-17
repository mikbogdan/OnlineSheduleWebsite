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

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode([
            'success' => false,
            'message' => 'Метод не поддерживается'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $branch = isset($_GET['branch']) ? trim($_GET['branch']) : '';
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';

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

    if ($query === '') {
        echo json_encode([
            'success' => true,
            'data' => [
                'subjects' => [],
                'clients' => [],
                'teachers' => []
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $like = '%' . $query . '%';

    $subjectsStmt = $pdo->prepare("
        SELECT id, subject
        FROM subjects
        WHERE {$subjectActiveField} = 'true'
        AND subject LIKE :query
        ORDER BY subject ASC
        LIMIT 10
    ");
    $subjectsStmt->execute([
        ':query' => $like
    ]);
    $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);

    $clientsStmt = $pdo->prepare("
        SELECT client_ID, client_name
        FROM clients
        WHERE client_branch = :branch
          AND client_name LIKE :query
        ORDER BY client_name ASC
        LIMIT 10
    ");
    $clientsStmt->execute([
        ':branch' => $branch,
        ':query' => $like
    ]);
    $clients = $clientsStmt->fetchAll(PDO::FETCH_ASSOC);

    $teachersStmt = $pdo->prepare("
        SELECT id, full_name
        FROM teachers
        WHERE branches = :branch
          AND full_name LIKE :query
        ORDER BY full_name ASC
        LIMIT 10
    ");
    $teachersStmt->execute([
        ':branch' => $branch,
        ':query' => $like
    ]);
    $teachers = $teachersStmt->fetchAll(PDO::FETCH_ASSOC);

    $contractsStmt = $pdo->prepare("
        SELECT DISTINCT l.LESSON_CONTRACT as contract
        FROM lessons l
        LEFT JOIN cabinets c ON c.id = l.LESSON_CABINET
        WHERE c.branch = :branch
        AND l.LESSON_CONTRACT LIKE :query
        AND l.LESSON_CONTRACT != ''
        LIMIT 10
    ");
    $contractsStmt->execute([
        ':branch' => $branch,
        ':query' => "%$query%"
    ]);

    $contracts = array_map(function ($row) {
        return [
            'id' => $row['contract'],
            'contract' => $row['contract']
        ];
    }, $contractsStmt->fetchAll(PDO::FETCH_ASSOC));

    $commentsStmt = $pdo->prepare("
        SELECT DISTINCT l.LESSON_COMMENT as comment
        FROM lessons l
        LEFT JOIN cabinets c ON c.id = l.LESSON_CABINET
        WHERE c.branch = :branch
        AND l.LESSON_COMMENT LIKE :query
        AND l.LESSON_COMMENT != ''
        LIMIT 10
    ");
    $commentsStmt->execute([
        ':branch' => $branch,
        ':query' => "%$query%"
    ]);

    $comments = array_map(function ($row) {
        return [
            'id' => md5($row['comment']),
            'comment' => $row['comment']
        ];
    }, $commentsStmt->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode([
        'success' => true,
        'data' => [
            'subjects' => $subjects,
            'clients' => $clients,
            'teachers' => $teachers,
            'contracts' => $contracts,
            'comments' => $comments
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}