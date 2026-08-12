-- ============================================================
-- Migration 007: Resequence `places.id` sequentially from 1 to N
-- ============================================================

-- This migration fixes ID jumps (e.g. 246 -> 4183) by renumbering place IDs sequentially
-- and updating all referencing foreign keys in tourism_types, user_signals, and user_place_scores.

-- 1. Disable Foreign Key Checks
SET foreign_key_checks = 0;

-- 2. Create a temporary mapping of old IDs to new sequential IDs (1 to N)
CREATE TEMPORARY TABLE temp_id_mapping (
    old_id INT,
    new_id INT AUTO_INCREMENT PRIMARY KEY
) SELECT id AS old_id FROM places ORDER BY id;

-- 3. Update referencing tables
UPDATE tourism_types t
JOIN temp_id_mapping m ON t.place_id = m.old_id
SET t.place_id = m.new_id;

UPDATE user_signals s
JOIN temp_id_mapping m ON s.place_id = m.old_id
SET s.place_id = m.new_id;

UPDATE place_images i
JOIN temp_id_mapping m ON i.place_id = m.old_id
SET i.place_id = m.new_id;

UPDATE user_place_scores u
JOIN temp_id_mapping m ON u.place_id = m.old_id
SET u.place_id = m.new_id;

UPDATE user_interactions ui
JOIN temp_id_mapping m ON ui.place_id = m.old_id
SET ui.place_id = m.new_id;

-- 4. Update the places table itself
UPDATE places p
JOIN temp_id_mapping m ON p.id = m.old_id
SET p.id = m.new_id;

-- 5. Reset AUTO_INCREMENT on places table to next sequential number
SET @max_id = (SELECT IFNULL(MAX(id), 0) FROM places);
SET @sql_query = CONCAT('ALTER TABLE places AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Clean up temporary table
DROP TEMPORARY TABLE temp_id_mapping;

-- 7. Enable Foreign Key Checks
SET foreign_key_checks = 1;
