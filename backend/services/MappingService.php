<?php

// โหลดกฎการแมปทั้งหมดจากตาราง mapping_rules
// คืนค่าเป็น array ของ row แต่ละรายการ ที่ประกอบด้วย keyword, category_id, rule_type
function loadMappingRules(PDO $pdo)
{
    return $pdo
        ->query("SELECT keyword, category_id, rule_type FROM mapping_rules ")
        ->fetchAll();
}

// ค้นหาประเภทของสถานที่จากชื่อสถานที่และกฎการแมป
// - $placeName: ชื่อสถานที่ที่ต้องการตรวจสอบ
// - $rules: array ของกฎ mapping ที่ได้จาก loadMappingRules()
// คืนค่าเป็น array ของ category_id ที่ match ตามกฎ
function findCategories($placeName, $rules)
{
    // แปลงชื่อสถานที่เป็นพิมพ์เล็ก เพื่อให้การตรวจสอบไม่สนใจตัวพิมพ์
    $text = mb_strtolower($placeName);

    // เก็บข้อมูล match ของแต่ละ rule เพื่อเลือก category ที่เหมาะสมที่สุด
    $matches = [];

    foreach ($rules as $rule) {
        $keyword = mb_strtolower($rule['keyword']);
        $matched = false;
        $position = null;
        $specificity = 0;
        $length = mb_strlen($keyword);

        switch ($rule['rule_type']) {
            case 'contains':
                // ถ้าชื่อสถานที่มี keyword อยู่ในข้อความใด ๆ
                $position = mb_strpos($text, $keyword);
                $matched = $position !== false;
                $specificity = 1; // contains มีความเฉพาะต่ำสุด
                break;

            case 'starts_with':
                // ถ้าชื่อสถานที่ขึ้นต้นด้วย keyword
                $position = mb_strpos($text, $keyword);
                $matched = $position === 0;
                $specificity = 2; // starts_with มีความเฉพาะสูงกว่า contains
                break;

            case 'exact':
                // ถ้าชื่อสถานที่ตรงกับ keyword แบบเป๊ะ ๆ
                $matched = trim($text) === $keyword;
                if ($matched) {
                    $position = 0;
                    $specificity = 3; // exact มีความเฉพาะสูงสุด
                }
                break;
        }

        if ($matched) {
            $matches[] = [
                'category_id' => $rule['category_id'],
                'specificity' => $specificity,
                'position' => $position,
                'length' => $length,
            ];
        }
    }

    if (empty($matches)) {
        // ถ้าไม่พบ match ใด ๆ ให้คืน empty array
        return [];
    }

    // เลือก match ที่มี specificity สูงสุดก่อน
    $bestSpecificity = max(array_column($matches, 'specificity'));

    // ถ้ามีหลาย match ที่ specificity เท่ากัน ให้เลือก keyword ที่ยาวที่สุด
    $bestLength = max(array_map(function ($match) use ($bestSpecificity) {
        return $match['specificity'] === $bestSpecificity ? $match['length'] : 0;
    }, $matches));

    // ถ้ายังเท่ากันอีก ให้เลือกตำแหน่งที่พบ keyword ก่อนสุด
    $earliestPosition = min(array_map(function ($match) use ($bestSpecificity, $bestLength) {
        return $match['specificity'] === $bestSpecificity && $match['length'] === $bestLength
            ? $match['position']
            : PHP_INT_MAX;
    }, $matches));

    $categories = [];
    foreach ($matches as $match) {
        if ($match['specificity'] === $bestSpecificity &&
            $match['length'] === $bestLength &&
            $match['position'] === $earliestPosition) {
            // เก็บ category_id ที่เป็น match ที่ดีที่สุด
            $categories[] = $match['category_id'];
        }
    }

    // คืน category_id แบบไม่ซ้ำกัน
    return array_unique($categories);
}