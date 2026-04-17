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
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $ids = isset($input['ids']) && is_array($input['ids']) ? $input['ids'] : [];

    if ($branch === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Не указан филиал'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $normalizedIds = [];

    if ($id > 0) {
        $normalizedIds[] = $id;
    }

    foreach ($ids as $item) {
        $value = (int)$item;
        if ($value > 0) {
            $normalizedIds[] = $value;
        }
    }

    $normalizedIds = array_values(array_unique($normalizedIds));

    if (!count($normalizedIds)) {
        echo json_encode([
            'success' => false,
            'message' => 'Не выбраны записи для удаления'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $placeholders = implode(',', array_fill(0, count($normalizedIds), '?'));

    $pdo->beginTransaction();

    $checkSql = "SELECT id FROM regular_lessons WHERE branch = ? AND id IN ($placeholders)";
    $checkStmt = $pdo->prepare($checkSql);
    $checkParams = array_merge([$branch], $normalizedIds);
    $checkStmt->execute($checkParams);

    $existingIds = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

    if (!count($existingIds)) {
        $pdo->rollBack();

        echo json_encode([
            'success' => false,
            'message' => 'Регулярные уроки не найдены'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $existingIds = array_map('intval', $existingIds);
    $existingPlaceholders = implode(',', array_fill(0, count($existingIds), '?'));

    $deleteLessonsSql = "
        DELETE FROM lessons
        WHERE regular_lesson_id IN ($existingPlaceholders)
          AND LESSON_DATA > CURDATE()
    ";
    $deleteLessonsStmt = $pdo->prepare($deleteLessonsSql);
    $deleteLessonsStmt->execute($existingIds);
    $deletedLessonsCount = $deleteLessonsStmt->rowCount();

    $deleteRegularSql = "
        DELETE FROM regular_lessons
        WHERE branch = ?
          AND id IN ($existingPlaceholders)
    ";
    $deleteRegularStmt = $pdo->prepare($deleteRegularSql);
    $deleteRegularParams = array_merge([$branch], $existingIds);
    $deleteRegularStmt->execute($deleteRegularParams);
    $deletedRegularCount = $deleteRegularStmt->rowCount();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Регулярные уроки удалены. Прошедшие занятия сохранены.',
        'deleted_regular_lessons' => $deletedRegularCount,
        'deleted_future_lessons' => $deletedLessonsCount
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}