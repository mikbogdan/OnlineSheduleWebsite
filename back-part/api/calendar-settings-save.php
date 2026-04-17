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

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode([
            'success' => false,
            'message' => 'Метод не поддерживается'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        echo json_encode([
            'success' => false,
            'message' => 'Некорректные входные данные'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $branch = isset($input['branch']) ? trim($input['branch']) : '';
    $workingDays = isset($input['workingDays']) && is_array($input['workingDays'])
        ? $input['workingDays']
        : [];
    $startHour = isset($input['startHour']) ? (int)$input['startHour'] : -1;
    $endHour = isset($input['endHour']) ? (int)$input['endHour'] : -1;
    $defaultView = isset($input['defaultView']) ? trim($input['defaultView']) : 'week';
    $cardFields = isset($input['cardFields']) && is_array($input['cardFields'])
        ? $input['cardFields']
        : [];

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $workingDays = array_values(array_unique(array_map('intval', $workingDays)));
    sort($workingDays);

    if (count($workingDays) === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Выберите хотя бы один рабочий день'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    foreach ($workingDays as $day) {
        if ($day < 1 || $day > 7) {
            echo json_encode([
                'success' => false,
                'message' => 'Некорректные рабочие дни'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }

    if ($startHour < 0 || $startHour > 23 || $endHour < 0 || $endHour > 23 || $startHour >= $endHour) {
        echo json_encode([
            'success' => false,
            'message' => 'Некорректное рабочее время'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($defaultView !== 'day' && $defaultView !== 'week') {
        $defaultView = 'week';
    }

    $showCabinet = !empty($cardFields['cabinet']) ? 1 : 0;
    $showSubject = !empty($cardFields['subject']) ? 1 : 0;
    $showType = !empty($cardFields['type']) ? 1 : 0;
    $showTeacher = !empty($cardFields['teacher']) ? 1 : 0;
    $showComment = !empty($cardFields['comment']) ? 1 : 0;
    $showClients = !empty($cardFields['clients']) ? 1 : 0;

    $stmt = $pdo->prepare("
        SELECT id
        FROM calendar_settings
        WHERE branch = :branch
        LIMIT 1
    ");
    $stmt->execute([':branch' => $branch]);
    $exists = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($exists) {
        $updateStmt = $pdo->prepare("
            UPDATE calendar_settings
            SET
                working_days = :working_days,
                start_hour = :start_hour,
                end_hour = :end_hour,
                default_view = :default_view,
                show_cabinet = :show_cabinet,
                show_subject = :show_subject,
                show_type = :show_type,
                show_teacher = :show_teacher,
                show_comment = :show_comment,
                show_clients = :show_clients
            WHERE branch = :branch
        ");

        $updateStmt->execute([
            ':working_days' => json_encode($workingDays, JSON_UNESCAPED_UNICODE),
            ':start_hour' => $startHour,
            ':end_hour' => $endHour,
            ':default_view' => $defaultView,
            ':show_cabinet' => $showCabinet,
            ':show_subject' => $showSubject,
            ':show_type' => $showType,
            ':show_teacher' => $showTeacher,
            ':show_comment' => $showComment,
            ':show_clients' => $showClients,
            ':branch' => $branch
        ]);
    } else {
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
            ':working_days' => json_encode($workingDays, JSON_UNESCAPED_UNICODE),
            ':start_hour' => $startHour,
            ':end_hour' => $endHour,
            ':default_view' => $defaultView,
            ':show_cabinet' => $showCabinet,
            ':show_subject' => $showSubject,
            ':show_type' => $showType,
            ':show_teacher' => $showTeacher,
            ':show_comment' => $showComment,
            ':show_clients' => $showClients
        ]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Настройки календаря сохранены'
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}