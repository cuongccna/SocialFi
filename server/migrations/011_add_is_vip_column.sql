-- Migration: Add is_vip column to users table
-- This column marks VIP/influencer profiles that get special treatment in feed

-- Add is_vip column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
    ) THEN
        ALTER TABLE users ADD COLUMN is_vip BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_vip column to users table';
    ELSE
        RAISE NOTICE 'is_vip column already exists';
    END IF;
END $$;

-- Create index for faster VIP queries
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip) WHERE is_vip = TRUE;

-- Optional: Mark some existing users as VIP for testing
-- UPDATE users SET is_vip = TRUE WHERE wallet_rank = 'WHALE' AND market_price > 100;

COMMENT ON COLUMN users.is_vip IS 'VIP/influencer profiles get priority placement in feed';
