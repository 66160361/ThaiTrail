<?php
require __DIR__ . '/../config/database.php';

require __DIR__ . '/../services/PlaceService.php';
require __DIR__ . '/../services/ReviewService.php';
require __DIR__ . '/../services/MappingService.php';

// ฟังก์ชัน savePlace ใช้บันทึกหรืออัปเดตข้อมูลสถานที่ในตาราง places
// ถ้า place_code ซ้ำ จะไม่เพิ่ม row ใหม่ แต่จะอัปเดตข้อมูลเดิมแทน
function savePlace(PDO $pdo, array $place): int
{
    $stmt = $pdo->prepare("INSERT INTO places
        (place_code, place_name, description, latitude, longitude, subdistrict, district, province, image_url)
        VALUES
        (:place_code, :place_name, :description, :latitude, :longitude, :subdistrict, :district, :province, :image_url)
        ON DUPLICATE KEY UPDATE
        place_name = VALUES(place_name),
        description = VALUES(description),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        subdistrict = VALUES(subdistrict),
        district = VALUES(district),
        province = VALUES(province),
        image_url = VALUES(image_url)");

    $stmt->execute($place);

    // ถ้า insert สำเร็จ จะได้ lastInsertId
    $placeId = $pdo->lastInsertId();
    if ($placeId) {
        return (int) $placeId;
    }

    // ถ้าเป็น update row เดิม ให้ดึง id ของ row นั้นมา
    $stmt = $pdo->prepare("SELECT id FROM places WHERE place_code = :place_code");
    $stmt->execute(['place_code' => $place['place_code']]);
    return (int) $stmt->fetchColumn();
}

// โหลดกฎแมพจากตาราง mapping_rules
$rules = loadMappingRules($pdo);

$jsonPath = __DIR__ . '/travel.json';
if (!is_file($jsonPath)) {
    throw new RuntimeException('ไม่พบไฟล์ travel.json ที่ ' . $jsonPath);
}

$json = json_decode(file_get_contents($jsonPath), true);
if (!is_array($json)) {
    throw new RuntimeException('ไฟล์ travel.json ไม่ใช่ JSON ที่ถูกต้อง');
}

foreach ($json as $wrapper) {
    $placeEntries = [];

    foreach (['Data_th', 'Data_en', 'Data_ch'] as $key) {
        if (!empty($wrapper[$key]) && is_array($wrapper[$key])) {
            $placeEntries = $wrapper[$key];
            break;
        }
    }

    if (empty($placeEntries)) {
        continue;
    }

    foreach ($placeEntries as $place) {
        $placeName = $place['title'] ?? $place['obj_title'] ?? null;
        $placeCode = $place['id_place'] ?? $place['obj_refcode'] ?? null;
        $description = $place['description'] ?? $place['obj_physicals'] ?? null;

        if (empty($placeName) || empty($placeCode)) {
            continue;
        }

        // ใช้ข้อมูลภาษาไทยเป็นหลัก ถ้า Data_th ว่างให้ใช้ Data_en/Data_ch แทน
        $preferredPlace = $place;
        if (empty($preferredPlace['title']) && !empty($place['obj_title'])) {
            $preferredPlace['title'] = $place['obj_title'];
        }

        $categories = findCategories($placeName, $rules);

        $placeId = savePlace($pdo, [
            'place_code' => $placeCode,
            'place_name' => $placeName,
            'description' => $description,
            'latitude' => $wrapper['Latitude'] ?? ($place['Latitude'] ?? null),
            'longitude' => $wrapper['Longitude'] ?? ($place['Longitude'] ?? null),
            'subdistrict' => $wrapper['Subdistrict'] ?? null,
            'district' => $wrapper['District'] ?? null,
            'province' => $wrapper['Province'] ?? null,
            'image_url' => is_array($wrapper['Picture'] ?? null) ? ($wrapper['Picture'][0] ?? null) : null,
        ]);

        $deleteOld = $pdo->prepare("DELETE FROM tourism_types WHERE place_id = :place_id");
        $deleteOld->execute(['place_id' => $placeId]);

        if (count($categories) > 0) {
            $stmt = $pdo->prepare("
                INSERT INTO tourism_types
                (place_id, category_id)
                VALUES
                (:place_id, :category_id)
                ");

            foreach ($categories as $cat) {
                $stmt->execute([
                    'place_id' => $placeId,
                    'category_id' => $cat,
                ]);
            }

            removeReview($pdo, $placeCode);
            echo "✔ " . $placeName . "<br>";
        } else {
            saveReview($pdo, [
                'place_code' => $placeCode,
                'place_name' => $placeName,
                'description' => $description,
                'raw_json_data' => json_encode($preferredPlace, JSON_UNESCAPED_UNICODE),
            ]);
            echo "⚠ " . $placeName . "<br>";
        }
    }
}