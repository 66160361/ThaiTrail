<?php
require __DIR__ . '/../config/database.php';
require __DIR__ . '/../services/TextUtility.php';

echo "Starting database cleanup...\n";

// 1. Clean places table
$placesQuery = "SELECT id, place_name, description FROM places WHERE place_name LIKE '%&%' OR description LIKE '%&%'";
$stmt = $pdo->query($placesQuery);
$places = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($places) . " places to clean.\n";

$updatePlaceStmt = $pdo->prepare("UPDATE places SET place_name = :place_name, description = :description WHERE id = :id");

$cleanedPlacesCount = 0;
foreach ($places as $place) {
    $cleanName = TextUtility::cleanText($place['place_name']);
    $cleanDesc = TextUtility::cleanText($place['description']);
    
    if ($cleanName !== $place['place_name'] || $cleanDesc !== $place['description']) {
        $updatePlaceStmt->execute([
            'place_name' => $cleanName,
            'description' => $cleanDesc,
            'id' => $place['id']
        ]);
        $cleanedPlacesCount++;
    }
}
echo "Cleaned $cleanedPlacesCount places.\n";

// 2. Clean mapping_review table
$reviewsQuery = "SELECT id, place_name, description FROM mapping_review WHERE place_name LIKE '%&%' OR description LIKE '%&%'";
$stmt = $pdo->query($reviewsQuery);
$reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($reviews) . " mapping reviews to clean.\n";

$updateReviewStmt = $pdo->prepare("UPDATE mapping_review SET place_name = :place_name, description = :description WHERE id = :id");

$cleanedReviewsCount = 0;
foreach ($reviews as $review) {
    $cleanName = TextUtility::cleanText($review['place_name']);
    $cleanDesc = TextUtility::cleanText($review['description']);
    
    if ($cleanName !== $review['place_name'] || $cleanDesc !== $review['description']) {
        $updateReviewStmt->execute([
            'place_name' => $cleanName,
            'description' => $cleanDesc,
            'id' => $review['id']
        ]);
        $cleanedReviewsCount++;
    }
}
echo "Cleaned $cleanedReviewsCount mapping reviews.\n";

echo "Database cleanup completed successfully!\n";
