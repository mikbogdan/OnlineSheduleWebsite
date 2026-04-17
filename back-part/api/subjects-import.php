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
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $data = json_decode(file_get_contents("php://input"), true);

    if (isset($data[0]) && is_array($data[0]) && !empty($data[0]) && is_array($data[0][0] ?? null)) {
        $data = $data[0];
    }

    if (empty($data) || !is_array($data)) {
        throw new Exception('Нет данных для вставки');
    }

    $stmt = $pdo->prepare("
        INSERT INTO subjects (subject, subject_type, subject_grade, subject_active_bobr, subject_active_minsk, subject_active_brest)
            VALUES (:subject, :type, :grade, 'true', 'true', 'true')
    ");

    $inserted = 0;

    foreach ($data as $row) {
        if (empty($row['subject'])) {
            continue; // пропускаем некорректные строки
        }

        $stmt->execute([
            ':subject' => trim($row['subject']),
            ':type'    => $row['subject_type'] ?? null,
            ':grade'   => $row['subject_grade'] ?? null
        ]);

        $inserted++;
    }

    echo json_encode([
        'success' => true,
        'inserted' => $inserted,
        'message' => $inserted . ' записей добавлено'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}