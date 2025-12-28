-- Migration: Add is_vip column to users table
-- This column marks VIP/Super profiles that should always appear in feed

-- Add is_vip column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;

-- Create index for faster VIP queries
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip) WHERE is_vip = TRUE;

-- Update VIP profiles (telegram_id >= 9900000001 are VIP fake accounts)
UPDATE users SET is_vip = TRUE WHERE telegram_id >= 9900000001 AND telegram_id <= 9900000100;

COMMENT ON COLUMN users.is_vip IS 'VIP profiles that always appear in feed regardless of swipe history';
