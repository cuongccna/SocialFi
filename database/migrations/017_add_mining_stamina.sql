-- Add mining_stamina column for the Love Mining Rig game
-- Stamina is consumed when tapping, recharged by sending chat messages

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mining_stamina INTEGER DEFAULT 100;

-- Create index for quick stamina lookups
CREATE INDEX IF NOT EXISTS idx_users_mining_stamina ON users(mining_stamina);

-- Add comment
COMMENT ON COLUMN users.mining_stamina IS 'Stamina for mining game. Max 100, recharges via chat messages.';
