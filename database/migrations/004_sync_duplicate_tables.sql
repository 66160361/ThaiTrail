-- ============================================================
-- Migration 004: Sync Duplicate Tables (After friend's DB import)
-- ============================================================
-- รัน: 2026-07-22
-- ผล: sync เสร็จสมบูรณ์
-- ============================================================

-- Step 1: เพิ่ม platform + duration_seconds เข้า user_signals
--   (ใช้ dynamic SQL เพราะ MySQL 8.4 ไม่รองรับ ADD COLUMN IF NOT EXISTS)
SET @has_platform = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_signals'
    AND COLUMN_NAME = 'platform'
);
SET @sql = IF(@has_platform = 0,
  'ALTER TABLE user_signals ADD COLUMN platform VARCHAR(50) NULL AFTER signal_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_dur = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_signals'
    AND COLUMN_NAME = 'duration_seconds'
);
SET @sql2 = IF(@has_dur = 0,
  'ALTER TABLE user_signals ADD COLUMN duration_seconds INT NULL AFTER platform',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Step 2: Migrate interactions → user_signals  (bookmark → save)
INSERT IGNORE INTO user_signals (user_id, place_id, signal_type, created_at)
SELECT user_id, place_id,
  CASE interaction_type WHEN 'bookmark' THEN 'save' ELSE interaction_type END,
  created_at
FROM interactions;

-- Step 3: Migrate user_interactions → user_signals (พร้อม platform, duration)
INSERT IGNORE INTO user_signals (user_id, place_id, signal_type, platform, duration_seconds, created_at)
SELECT user_id, place_id,
  CASE action_type WHEN 'bookmark' THEN 'save' ELSE action_type END,
  platform, duration_seconds, created_at
FROM user_interactions;

-- Step 4: Migrate user_preferences → user_interests  (weight default 1.00)
INSERT IGNORE INTO user_interests (user_id, category_id, weight)
SELECT user_id, category_id, 1.00
FROM user_preferences;

-- Step 5: Drop ตารางซ้ำซ้อน
DROP TABLE IF EXISTS user_interactions;
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS user_preferences;
