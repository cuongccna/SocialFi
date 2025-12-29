-- ============================================
-- Migration 009: Pump Profile Feature
-- Allow users to boost their profile visibility
-- ============================================

-- Add boosted_until column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMP WITH TIME ZONE;

-- Create index for finding boosted users efficiently
CREATE INDEX IF NOT EXISTS idx_users_boosted_until 
ON users (boosted_until DESC NULLS LAST)
WHERE boosted_until IS NOT NULL;

-- Create composite index for feed queries with boost priority
CREATE INDEX IF NOT EXISTS idx_users_feed_boost 
ON users (is_active, boosted_until DESC NULLS LAST, market_price DESC);

-- Comment on column
COMMENT ON COLUMN users.boosted_until IS 'Profile is boosted and prioritized in feed until this timestamp';
