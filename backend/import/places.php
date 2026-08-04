<?php
require __DIR__ . '/../config/database.php';
require __DIR__ . '/../services/MappingService.php';
require __DIR__ . '/../services/PlaceService.php';
require __DIR__ . '/../services/ReviewService.php';
require __DIR__ . '/../services/TextUtility.php';

// ฟังก์ชัน savePlace ใช้บันทึกหรืออัปเดตข้อมูลสถานที่ในตาราง places
// ถ้า place_code ซ้ำ จะไม่เพิ่ม row ใหม่ แต่จะอัปเดตข้อมูลเดิมแทน
function savePlace(PDO $pdo, $place)
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
        return $placeId;
    }

    // ถ้าเป็น update row เดิม ให้ดึง id ของ row นั้นมา
    $stmt = $pdo->prepare("SELECT id FROM places WHERE place_code = :place_code");
    $stmt->execute(['place_code' => $place['place_code']]);
    return $stmt->fetchColumn();
}

// โหลดกฎแมพจากตาราง mapping_rules
$rules = loadMappingRules($pdo);

// อ่านไฟล์ JSON ของข้อมูลสถานที่
$jsonPath = __DIR__ . '/places.json';
if (!is_file($jsonPath)) {
    throw new RuntimeException('ไม่พบไฟล์ places.json ที่ ' . $jsonPath);
}

$json = json_decode(file_get_contents($jsonPath), true);
if (!is_array($json)) {
    throw new RuntimeException('ไฟล์ places.json ไม่ใช่ JSON ที่ถูกต้อง');
}

foreach ($json as $wrapper) {
    $placeEntries = $wrapper['Data_th'] ?? [];
    if (!is_array($placeEntries)) {
        continue;
    }

    foreach ($placeEntries as $place) {
        $placeName = TextUtility::cleanText($place['obj_title'] ?? null);
        $placeCode = $place['obj_refcode'] ?? null;

        if (empty($placeName) || empty($placeCode)) {
            continue;
        }

        $categories = findCategories($placeName, $rules);

        $lat = isset($place['Latitude']) && $place['Latitude'] !== '' ? (float) $place['Latitude'] : null;
        $lon = isset($place['Longitude']) && $place['Longitude'] !== '' ? (float) $place['Longitude'] : null;

        $description = TextUtility::cleanText($place['obj_physicals'] ?? null);

        $placeId = savePlace($pdo, [
            'place_code' => $placeCode,
            'place_name' => $placeName,
            'description' => $description,
            'latitude' => $lat,
            'longitude' => $lon,
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
                (place_id,category_id)
                VALUES
                (:place_id,:category_id)
                ");

            foreach ($categories as $cat) {
                $stmt->execute([
                    'place_id' => $placeId,
                    'category_id' => $cat,
                ]);
            }

            // Insert images into place_images table
            $deleteOldImages = $pdo->prepare("DELETE FROM place_images WHERE place_id = :place_id");
            $deleteOldImages->execute(['place_id' => $placeId]);

            if (isset($wrapper['Picture']) && is_array($wrapper['Picture'])) {
                $insertImage = $pdo->prepare("INSERT INTO place_images (place_id, image_url) VALUES (:place_id, :image_url)");
                foreach ($wrapper['Picture'] as $picUrl) {
                    if (!empty($picUrl)) {
                        $insertImage->execute([
                            'place_id' => $placeId,
                            'image_url' => $picUrl
                        ]);
                    }
                }
            }

            removeReview($pdo, $placeCode);
            echo "✔ " . $placeName . "<br>";
        } else {
            saveReview($pdo, [
                'place_code' => $placeCode,
                'place_name' => $placeName,
                'description' => $description,
                'raw_json_data' => json_encode($place, JSON_UNESCAPED_UNICODE),
            ]);
            echo "⚠ " . $placeName . "<br>";
        }
    }
}