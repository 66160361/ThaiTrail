-- ============================================================
-- Migration 005: Drop Unnecessary and Duplicate Tables
-- ============================================================

SET foreign_key_checks = 0;

-- 1. Sync any remaining user_dismissed into user_signals before dropping
INSERT IGNORE INTO user_signals (user_id, place_id, signal_type)
SELECT user_id, place_id, 'dismiss'
FROM user_dismissed
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_dismissed');

-- 2. Drop duplicate / obsolete tables
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS user_interactions;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS provinces;
DROP TABLE IF EXISTS user_dismissed;

SET foreign_key_checks = 1;
