-- Migration: Create user_place_scores table
-- Purpose: Pre-compute and persist recommendation scores per (user, place)
-- Score = SUM(user_interests.weight for matching categories) + view_bonus
-- Province bonus (+2.5) is added at query time (changes frequently)

CREATE TABLE IF NOT EXISTS user_place_scores (
    user_id     INT       NOT NULL,
    place_id    INT       NOT NULL,
    score       FLOAT     NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, place_id),
    INDEX idx_user_score  (user_id, score DESC),
    INDEX idx_place       (place_id)
);
