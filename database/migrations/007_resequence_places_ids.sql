-- ============================================================
-- Migration 007: Resequence `places.id` sequentially from 1 to N
-- ============================================================

-- This migration fixes ID jumps (e.g. 246 -> 4183) by renumbering place IDs sequentially
-- and updating all referencing foreign keys in tourism_types, user_signals, and user_place_scores.
