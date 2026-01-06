-- ============================================
-- Migration: Add Tutorial Field
-- Tracks if user has completed onboarding tutorial
-- ============================================

-- Add has_seen_tutorial column (default FALSE for new users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN users.has_seen_tutorial IS 'Whether user has completed the onboarding tutorial';
