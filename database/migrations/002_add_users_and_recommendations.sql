-- ============================================================
-- Migration 002: Users & Personalized Recommendation System
-- ============================================================

-- NOTE: A `users` table already existed with Google OAuth columns (google_id, avatar_url, role).
-- The CREATE TABLE below is skipped (IF NOT EXISTS). The following ALTER statements extend it:
--   ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;
--   ALTER TABLE users ADD COLUMN onboarded TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;
--   ALTER TABLE users MODIFY COLUMN google_id VARCHAR(255) NULL DEFAULT NULL;
--
-- User accounts (created fresh if table did not exist)
CREATE TABLE IF NOT EXISTS users (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NULL,
  onboarded     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User selected interests (maps to categories)
-- weight starts at 1.00 and is boosted by behavior signals (like/save/share)
CREATE TABLE IF NOT EXISTS user_interests (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  category_id INT           NOT NULL,
  weight      DECIMAL(8,2)  NOT NULL DEFAULT 1.00,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_category (user_id, category_id),
  INDEX idx_user_interests_user (user_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generic behavioral event log
-- Signals: view, like, save, share, dismiss
-- Positive signals (like, save, share) also boost user_interests.weight
CREATE TABLE IF NOT EXISTS user_signals (
  id         INT  AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  place_id   INT  NOT NULL,
  signal_type ENUM('view','like','save','share','dismiss') NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_signals_user  (user_id, signal_type),
  INDEX idx_user_signals_place (place_id, signal_type),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Places permanently excluded from a user's recommendations
CREATE TABLE IF NOT EXISTS user_dismissed (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  place_id   INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dismissed (user_id, place_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
