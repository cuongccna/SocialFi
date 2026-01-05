-- ============================================
-- Migration: Add Edit Profile Fields
-- Adds interests, assets, job_title, photos columns to users table
-- ============================================

-- Add job_title column
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- Add interests as JSONB array (e.g., ["DeFi", "NFT", "Travel"])
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;

-- Add assets as JSONB array of objects (e.g., [{"symbol": "BTC", "amount": 1.5}])
ALTER TABLE users ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]'::jsonb;

-- Add photos as JSONB array of URLs (up to 4 photos)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Create index on interests for faster searching
CREATE INDEX IF NOT EXISTS idx_users_interests ON users USING GIN (interests);

-- Create index on assets for searching by coin holdings
CREATE INDEX IF NOT EXISTS idx_users_assets ON users USING GIN (assets);

-- Comment on columns for documentation
COMMENT ON COLUMN users.job_title IS 'User job title displayed on profile';
COMMENT ON COLUMN users.interests IS 'Array of interest tags: DeFi, NFT, Travel, Gym, Memecoins';
COMMENT ON COLUMN users.assets IS 'Array of crypto holdings: [{symbol, amount}]';
COMMENT ON COLUMN users.photos IS 'Array of photo URLs for profile gallery (max 4)';
