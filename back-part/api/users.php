<?php
    // users.php

    // === CORS ===
    header('Access-Control-Allow-Origin: http://localhost:1234');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(); 
    }

    header('Content-Type: application/json; charset=utf-8');

    // === Сессия ===
    session_start();

    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'superadmin') {
        echo json_encode([
            'success' => false,
            'message' => 'Доступ запрещён'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // === Конфиг БД ===
    $config = require '../config/db.php';

    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
            $config['username']
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        error_log("DB Connection Error: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Ошибка подключения к БД'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // === Параметры запроса ===
    $page   = max(1, (int)($_GET['page']   ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit']  ?? 50)));
    $search = trim($_GET['search'] ?? '');

    $offset = ($page - 1) * $limit;

    // === WHERE условия ===
    $where = [];
    $params = [];

    if ($search !== '') {
        $where[] = "login LIKE :search";
        $params[':search'] = "%$search%";
    }

    // === Считаем общее количество ===
    $countSql = "SELECT COUNT(*) as total FROM users";
    if (!empty($where)) {
        $countSql .= " WHERE " . implode(" AND ", $where);
    }

    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    // === Основной запрос с LIMIT ===
    $sql = "
        SELECT 
            u.user_id, 
            u.login, 
            u.role, 
            u.branches,
            u.t_id,                  
            t.full_name         
        FROM users u
        LEFT JOIN teachers t ON u.t_id = t.id
    ";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY login LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // === Ответ ===
    echo json_encode([
        'success' => true,
        'data'    => $users,
        'total'   => $total,
        'page'    => $page,
        'limit'   => $limit
    ], JSON_UNESCAPED_UNICODE);
    exit();