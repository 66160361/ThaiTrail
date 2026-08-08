-- Migration: Add place metrics columns
SET @has_word_count = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'places'
    AND COLUMN_NAME = 'word_count'
);
SET @sql = IF(@has_word_count = 0,
  'ALTER TABLE places ADD COLUMN word_count INT NOT NULL DEFAULT 0 AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_photo_count = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'places'
    AND COLUMN_NAME = 'photo_count'
);
SET @sql2 = IF(@has_photo_count = 0,
  'ALTER TABLE places ADD COLUMN photo_count INT NOT NULL DEFAULT 0 AFTER word_count',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @has_expected_read_time = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'places'
    AND COLUMN_NAME = 'expected_read_time'
);
SET @sql3 = IF(@has_expected_read_time = 0,
  'ALTER TABLE places ADD COLUMN expected_read_time INT NOT NULL DEFAULT 0 AFTER photo_count',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
