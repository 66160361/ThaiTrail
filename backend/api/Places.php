<?php

require_once __DIR__ . '/../config/database.php';

function toTimeArray($value): array
{
    if ($value === null || $value === '') {
        return [];
    }

    if (is_array($value)) {
        return array_values(array_filter($value, static fn($item) => $item !== null && $item !== ''));
    }

    if (!is_string($value)) {
        return [$value];
    }

    $decoded = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return array_values(array_filter($decoded, static fn($item) => $item !== null && $item !== ''));
    }

    if (str_contains($value, ',')) {
        return array_values(array_filter(array_map('trim', explode(',', $value)), static fn($item) => $item !== ''));
    }

    return [trim($value)];
}

function normalizePlaceTimes(array $place): array
{
    if (array_key_exists('opening_time', $place)) {
        $place['opening_time'] = toTimeArray($place['opening_time']);
    }

    if (array_key_exists('closing_time', $place)) {
        $place['closing_time'] = toTimeArray($place['closing_time']);
    }

    return $place;
}

// 1. ดักจับค่ากรองรายหมวดหมู่ (เช็กทั้งคู่ เผื่อฝั่ง React ส่งชื่อไหนมาก็รอด)
$categoryId = $_GET['category_id'] ?? $_GET['group_by_category'] ?? null;

// 2. ตรวจสอบว่าต้องการ "จัดกลุ่มโหมดดึงทั้งหมดแยกตามหมวดหมู่ (Group All)" หรือไม่ 

$groupByCategory = isset($_GET['mode']) && $_GET['mode'] === 'group';


//
if ($groupByCategory) {
    // ถ้าโหมดเป็น "จัดกลุ่มตามหมวดหมู่" ให้ดึงข้อมูลหมวดหมู่ทั้งหมดพร้อมกับสถานที่ที่เกี่ยวข้อง
    $categories = $pdo->query('SELECT id, category_name FROM categories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($categories as &$category) {
        $stmt = $pdo->prepare(
            'SELECT p.* FROM places p
             INNER JOIN tourism_types tt ON p.id = tt.place_id
             WHERE tt.category_id = :category_id'
        );

        $stmt->execute(['category_id' => $category['id']]);
        $category['places'] = array_map('normalizePlaceTimes', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    unset($category);
    $response = $categories;

} elseif ($categoryId !== null && $categoryId !== '') {
    // ถ้ามีการส่งเลขหมวดหมู่มา จะเข้าเงื่อนไขนี้
    // ดึงสถานที่ในหมวดที่ระบุ พร้อมรายการหมวดหมู่ของแต่ละสถานที่
    $sql = "SELECT p.*, 
                   GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                   GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
            FROM places p
            INNER JOIN tourism_types tt ON p.id = tt.place_id
            LEFT JOIN categories c ON tt.category_id = c.id
            WHERE tt.category_id = :category_id
            GROUP BY p.id
            ORDER BY p.place_name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['category_id' => $categoryId]);
    $response = array_map('normalizePlaceTimes', $stmt->fetchAll(PDO::FETCH_ASSOC));

} else {
    // ถ้าไม่ส่งเลขหมวดหมู่มา จะเข้าเงื่อนไขนี้
    // ดึงสถานที่ทั้งหมด พร้อมรายการหมวดหมู่ของแต่ละสถานที่
    $stmt = $pdo->query(
        "SELECT p.*, 
                GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
         FROM places p
         LEFT JOIN tourism_types tt ON p.id = tt.place_id
         LEFT JOIN categories c ON tt.category_id = c.id
         GROUP BY p.id
         ORDER BY p.place_name"
    );
    $response = array_map('normalizePlaceTimes', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

echo json_encode($response, JSON_UNESCAPED_UNICODE);