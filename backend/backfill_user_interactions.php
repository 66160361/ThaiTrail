<?php
require_once 'c:\Users\Rachata\OneDrive\Documents\GitHub\ThaiTrail\backend\config\env.php';
require_once 'c:\Users\Rachata\OneDrive\Documents\GitHub\ThaiTrail\backend\config\database.php';
require_once 'c:\Users\Rachata\OneDrive\Documents\GitHub\ThaiTrail\backend\services\ScoreService.php';

loadAppEnv();

try {
    echo "Starting historical user interactions sync...\n";
    
    // 1. Truncate user_interactions to ensure clean state
    $pdo->exec("TRUNCATE TABLE user_interactions");
    echo "1. Truncated user_interactions table.\n";
    
    // 2. Populate user_interactions from user_signals
    $syncSql = "
        INSERT INTO user_interactions (
            user_id,
            place_id,
            has_shared,
            has_saved,
            has_liked,
            total_dwell_time,
            click_count,
            last_action_at
        )
        SELECT
            user_id,
            place_id,
            MAX(CASE WHEN signal_type = 'share' THEN 1 ELSE 0 END) AS has_shared,
            MAX(CASE WHEN signal_type = 'save' THEN 1 ELSE 0 END) AS has_saved,
            MAX(CASE WHEN signal_type = 'like' THEN 1 ELSE 0 END) AS has_liked,
            SUM(COALESCE(duration_seconds, 0)) AS total_dwell_time,
            COUNT(CASE WHEN signal_type = 'view' THEN 1 ELSE NULL END) AS click_count,
            MAX(created_at) AS last_action_at
        FROM user_signals
        GROUP BY user_id, place_id
    ";
    
    $rowsInserted = $pdo->exec($syncSql);
    echo "2. Populated user_interactions table with $rowsInserted rows from user_signals.\n";
    
    // 3. Recalculate scores and preference_scores for all users
    $usersStmt = $pdo->query("SELECT DISTINCT user_id FROM user_interactions");
    $userIds = $usersStmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "3. Recalculating scores for " . count($userIds) . " users...\n";
    $scoreService = new ScoreService($pdo);
    
    foreach ($userIds as $uId) {
        $scoreService->recalcAll((int) $uId);
        echo "   - Recalculated scores & preference_scores for User ID: $uId\n";
    }
    
    echo "Sync and recalculation completed successfully!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
