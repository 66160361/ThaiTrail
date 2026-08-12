-- Migration: Ensure user_signals supports duration tracking metadata

SET @has_platform = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_signals'
    AND COLUMN_NAME = 'platform'
);

SET @sql_platform = IF(
  @has_platform = 0,
  'ALTER TABLE user_signals ADD COLUMN platform VARCHAR(50) NULL AFTER signal_type',
  'SELECT 1'
);

PREPARE stmt_platform FROM @sql_platform;
EXECUTE stmt_platform;
DEALLOCATE PREPARE stmt_platform;

SET @has_duration = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_signals'
    AND COLUMN_NAME = 'duration_seconds'
);

SET @sql_duration = IF(
  @has_duration = 0,
  'ALTER TABLE user_signals ADD COLUMN duration_seconds INT NULL AFTER platform',
  'SELECT 1'
);

PREPARE stmt_duration FROM @sql_duration;
EXECUTE stmt_duration;
DEALLOCATE PREPARE stmt_duration;