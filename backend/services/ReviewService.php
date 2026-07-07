<?php

//บันทึกรีวิวสถานที่
function saveReview(PDO $pdo, $place)
{

    $sql = "INSERT INTO mapping_review(place_code,place_name,description,raw_json_data,status)VALUES(:place_code,:place_name,:description,:raw_json_data,'pending')ON DUPLICATE KEY UPDATE
place_name=VALUES(place_name),
description=VALUES(description),
raw_json_data=VALUES(raw_json_data)

";

    $stmt = $pdo->prepare($sql);

    $stmt->execute($place);

}
    //ลบรีวิวที่มีอยู่แล้ว
function removeReview(PDO $pdo, $placeCode)
{

    $stmt = $pdo->prepare("

DELETE FROM mapping_review

WHERE place_code=:place_code

");

    $stmt->execute([

        'place_code' => $placeCode

    ]);

}