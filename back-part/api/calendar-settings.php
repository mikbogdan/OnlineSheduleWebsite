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

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT
            id,
            branch,
            working_days,
            start_hour,
            end_hour,
            default_view,
            show_cabinet,
            show_subject,
            show_type,
            show_teacher,
            show_comment,
            show_clients
        FROM calendar_settings
        WHERE branch = :branch
        LIMIT 1
    ");
    $stmt->execute([':branch' => $branch]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        $defaultWorkingDays = json_encode([1, 2, 3, 4, 5, 6], JSON_UNESCAPED_UNICODE);

        $insertStmt = $pdo->prepare("
            INSERT INTO calendar_settings (
                branch,
                working_days,
                start_hour,
                end_hour,
                default_view,
                show_cabinet,
                show_subject,
                show_type,
                show_teacher,
                show_comment,
                show_clients
            ) VALUES (
                :branch,
                :working_days,
                :start_hour,
                :end_hour,
                :default_view,
                :show_cabinet,
                :show_subject,
                :show_type,
                :show_teacher,
                :show_comment,
                :show_clients
            )
        ");

        $insertStmt->execute([
            ':branch' => $branch,
            ':working_days' => $defaultWorkingDays,
            ':start_hour' => 8,
            ':end_hour' => 20,
            ':default_view' => 'week',
            ':show_cabinet' => 1,
            ':show_subject' => 1,
            ':show_type' => 1,
            ':show_teacher' => 1,
            ':show_comment' => 1,
            ':show_clients' => 0
        ]);

        $stmt = $pdo->prepare("
            SELECT
                id,
                branch,
                working_days,
                start_hour,
                end_hour,
                default_view,
                show_cabinet,
                show_subject,
                show_type,
                show_teacher,
                show_comment,
                show_clients
            FROM calendar_settings
            WHERE branch = :branch
            LIMIT 1
        ");
        $stmt->execute([':branch' => $branch]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $workingDays = json_decode($settings['working_days'], true);

    if (!is_array($workingDays)) {
        $workingDays = [1, 2, 3, 4, 5, 6];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => (int)$settings['id'],
            'branch' => $settings['branch'],
            'workingDays' => array_map('intval', $workingDays),
            'startHour' => (int)$settings['start_hour'],
            'endHour' => (int)$settings['end_hour'],
            'defaultView' => $settings['default_view'],
            'cardFields' => [
                'cabinet' => (bool)$settings['show_cabinet'],
                'subject' => (bool)$settings['show_subject'],
                'type' => (bool)$settings['show_type'],
                'teacher' => (bool)$settings['show_teacher'],
                'comment' => (bool)$settings['show_comment'],
                'clients' => (bool)$settings['show_clients']
            ]
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}