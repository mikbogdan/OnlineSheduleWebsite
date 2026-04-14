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
require_once '../includes/generate_regular_lessons.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['username'],
        $config['password'] ?? '',
        $config['options'] ?? []
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

    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $branch = isset($input['branch']) ? trim($input['branch']) : '';
    $weekday = isset($input['weekday']) ? (int)$input['weekday'] : 0;
    $timeStart = isset($input['timeStart']) ? trim($input['timeStart']) : '';
    $timeEnd = isset($input['timeEnd']) ? trim($input['timeEnd']) : '';
    $cabinetId = isset($input['cabinetId']) ? (int)$input['cabinetId'] : 0;
    $subjectId = isset($input['subjectId']) ? (int)$input['subjectId'] : 0;
    $subjectName = isset($input['subjectName']) ? trim($input['subjectName']) : '';
    $teachers = isset($input['teachers']) && is_array($input['teachers']) ? $input['teachers'] : [];
    $dateFrom = isset($input['dateFrom']) ? trim($input['dateFrom']) : '';
    $dateTo = isset($input['dateTo']) ? trim($input['dateTo']) : '';
    $lessonType = isset($input['lessonType']) ? trim($input['lessonType']) : '';

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if (!in_array($lessonType, ['group', 'individual', 'trial'], true)) {
        echo json_encode([
            'success' => false,
            'message' => 'Некорректный тип урока'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($weekday < 1 || $weekday > 7) {
        echo json_encode([
            'success' => false,
            'message' => 'Некорректный день недели'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($timeStart === '' || $timeEnd === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указано время'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($timeStart >= $timeEnd) {
        echo json_encode([
            'success' => false,
            'message' => 'Время окончания должно быть больше времени начала'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($cabinetId <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан кабинет'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($subjectId <= 0 || $subjectName === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан предмет'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if (!count($teachers)) {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан ни один педагог'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($dateFrom === '' || $dateTo === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан период'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($dateFrom > $dateTo) {
        echo json_encode([
            'success' => false,
            'message' => 'Дата начала периода не может быть больше даты окончания'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $normalizedTeachers = [];

    foreach ($teachers as $teacher) {
        $teacherId = isset($teacher['id']) ? (int)$teacher['id'] : 0;
        $teacherLabel = isset($teacher['label']) ? trim($teacher['label']) : '';

        if ($teacherId > 0 && $teacherLabel !== '') {
            $normalizedTeachers[] = [
                'id' => $teacherId,
                'label' => $teacherLabel
            ];
        }
    }

    if (!count($normalizedTeachers)) {
        echo json_encode([
            'success' => false,
            'message' => 'Некорректные данные педагогов'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $teachersJson = json_encode($normalizedTeachers, JSON_UNESCAPED_UNICODE);

    if ($id > 0) {
        $checkStmt = $pdo->prepare("
            SELECT id
            FROM regular_lessons
            WHERE id = :id
              AND branch = :branch
            LIMIT 1
        ");
        $checkStmt->execute([
            ':id' => $id,
            ':branch' => $branch
        ]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            echo json_encode([
                'success' => false,
                'message' => 'Запись для редактирования не найдена'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $stmt = $pdo->prepare("
            UPDATE regular_lessons
            SET
                weekday = :weekday,
                lesson_type = :lesson_type,
                time_start = :time_start,
                time_end = :time_end,
                cabinet_id = :cabinet_id,
                subject_id = :subject_id,
                subject_name = :subject_name,
                teachers_json = :teachers_json,
                date_from = :date_from,
                date_to = :date_to
            WHERE id = :id
              AND branch = :branch
        ");

        $stmt->execute([
            ':weekday' => $weekday,
            ':lesson_type' => $lesson_type,
            ':time_start' => $timeStart,
            ':time_end' => $timeEnd,
            ':cabinet_id' => $cabinetId,
            ':subject_id' => $subjectId,
            ':subject_name' => $subjectName,
            ':teachers_json' => $teachersJson,
            ':date_from' => $dateFrom,
            ':date_to' => $dateTo,
            ':id' => $id,
            ':branch' => $branch
        ]);

        $regularLessonId = $id;
        $generateResult = generateLessonsForRegularLesson($pdo, $regularLessonId);

        echo json_encode([
            'success' => true,
            'message' => 'Регулярный урок обновлён',
            'created_count' => $generateResult['created_count']
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $stmt = $pdo->prepare("
        INSERT INTO regular_lessons (
            branch,
            weekday,
            lesson_type,
            time_start,
            time_end,
            cabinet_id,
            subject_id,
            subject_name,
            teachers_json,
            date_from,
            date_to
        ) VALUES (
            :branch,
            :weekday,
            :lesson_type,
            :time_start,
            :time_end,
            :cabinet_id,
            :subject_id,
            :subject_name,
            :teachers_json,
            :date_from,
            :date_to
        )
    ");

    $stmt->execute([
        ':branch' => $branch,
        ':weekday' => $weekday,
        ':lesson_type' => $lessonType,
        ':time_start' => $timeStart,
        ':time_end' => $timeEnd,
        ':cabinet_id' => $cabinetId,
        ':subject_id' => $subjectId,
        ':subject_name' => $subjectName,
        ':teachers_json' => $teachersJson,
        ':date_from' => $dateFrom,
        ':date_to' => $dateTo
    ]);

    $regularLessonId = (int)$pdo->lastInsertId();
    $generateResult = generateLessonsForRegularLesson($pdo, $regularLessonId);

    echo json_encode([
        'success' => true,
        'message' => 'Регулярный урок создан',
        'id' => (int)$pdo->lastInsertId(),
        'created_count' => $generateResult['created_count']
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}