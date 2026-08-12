-- Migration: Ensure user_interests has weight column used by recommendation scoring

SET @has_weight = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_interests'
    AND COLUMN_NAME = 'weight'
);

SET @sql_weight = IF(
  @has_weight = 0,
  'ALTER TABLE user_interests ADD COLUMN weight DECIMAL(8,2) NOT NULL DEFAULT 1.00 AFTER category_id',
  'SELECT 1'
);

PREPARE stmt_weight FROM @sql_weight;
EXECUTE stmt_weight;
DEALLOCATE PREPARE stmt_weight;

-- Normalize existing rows to a sane default if legacy data exists
UPDATE user_interests
SET weight = 1.00
WHERE weight IS NULL OR weight <= 0;