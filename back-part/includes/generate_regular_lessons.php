<?php

function getDatesByWeekdayInRange($dateFrom, $dateTo, $weekday)
{
    $dates = [];

    $start = new DateTime($dateFrom);
    $end = new DateTime($dateTo);
    $end->setTime(23, 59, 59);

    while ($start <= $end) {
        $currentWeekday = (int)$start->format('N'); // 1..7
        if ($currentWeekday === (int)$weekday) {
            $dates[] = $start->format('Y-m-d');
        }
        $start->modify('+1 day');
    }

    return $dates;
}

function regularLessonExists($pdo, $regularLessonId, $lessonDate)
{
    $stmt = $pdo->prepare("
        SELECT LESSON_ID
        FROM lessons
        WHERE regular_lesson_id = :regular_lesson_id
          AND LESSON_DATA = :lesson_date
        LIMIT 1
    ");
    $stmt->execute([
        ':regular_lesson_id' => $regularLessonId,
        ':lesson_date' => $lessonDate
    ]);

    return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
}

function createLessonFromRegular($pdo, $regularLesson, $lessonDate)
{
    $teachers = json_decode($regularLesson['teachers_json'], true);
    if (!is_array($teachers)) {
        $teachers = [];
    }

    $teacherLabels = array_map(function ($teacher) {
        return isset($teacher['label']) ? trim($teacher['label']) : '';
    }, $teachers);

    $teacherLabels = array_filter($teacherLabels, function ($value) {
        return $value !== '';
    });

    $lessonTeacher = implode(', ', $teacherLabels);

    $stmt = $pdo->prepare("
        INSERT INTO lessons (
            LESSON_DATA,
            LESSON_TYPE,
            LESSON_START,
            LESSON_END,
            LESSON_CABINET,
            LESSON_BRANCH,
            LESSON_NAME,
            LESSON_TEACHER,
            regular_lesson_id
        ) VALUES (
            :lesson_date,
            :lesson_type,
            :lesson_start,
            :lesson_end,
            :lesson_cabinet,
            :lesson_branch,
            :lesson_name,
            :lesson_teacher,
            :regular_lesson_id
        )
    ");

    $stmt->execute([
        ':lesson_date' => $lessonDate,
        ':lesson_branch' => $regularLesson['branch'],
        ':lesson_type' => $regularLesson['lesson_type'],
        ':lesson_start' => $regularLesson['time_start'],
        ':lesson_end' => $regularLesson['time_end'],
        ':lesson_cabinet' => $regularLesson['cabinet_id'],
        ':lesson_name' => $regularLesson['subject_name'],
        ':lesson_teacher' => $lessonTeacher,
        ':regular_lesson_id' => $regularLesson['id']
    ]);
}

function generateLessonsForRegularLesson($pdo, $regularLessonId)
{
    $stmt = $pdo->prepare("
        SELECT *
        FROM regular_lessons
        WHERE id = :id
        LIMIT 1
    ");
    $stmt->execute([':id' => $regularLessonId]);
    $regularLesson = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$regularLesson) {
        return [
            'success' => false,
            'created_count' => 0,
            'message' => 'Регулярный урок не найден'
        ];
    }

    $dates = getDatesByWeekdayInRange(
        $regularLesson['date_from'],
        $regularLesson['date_to'],
        $regularLesson['weekday']
    );

    $createdCount = 0;

    foreach ($dates as $lessonDate) {
        if (regularLessonExists($pdo, $regularLesson['id'], $lessonDate)) {
            continue;
        }

        createLessonFromRegular($pdo, $regularLesson, $lessonDate);
        $createdCount++;
    }

    return [
        'success' => true,
        'created_count' => $createdCount,
        'message' => 'Генерация завершена'
    ];
}

function generateLessonsForAllRegularLessons($pdo)
{
    $stmt = $pdo->query("
        SELECT id
        FROM regular_lessons
        ORDER BY id ASC
    ");
    $regularLessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalCreated = 0;

    foreach ($regularLessons as $item) {
        $result = generateLessonsForRegularLesson($pdo, (int)$item['id']);
        $totalCreated += (int)$result['created_count'];
    }

    return [
        'success' => true,
        'created_count' => $totalCreated
    ];
}