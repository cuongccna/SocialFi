-- Migration: Add tasks and referrals tables
-- For Earn More $LOVE and Invite Friends features

-- Daily tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  reward_amount DECIMAL(18,6) NOT NULL DEFAULT 10.0,
  task_type VARCHAR(20) DEFAULT 'DAILY' CHECK (task_type IN ('DAILY', 'WEEKLY', 'ONE_TIME', 'ACHIEVEMENT')),
  requirement_type VARCHAR(30) DEFAULT 'ACTION',
  requirement_value INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User completed tasks
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(18,6),
  
  -- For daily tasks, track the date
  task_date DATE DEFAULT CURRENT_DATE
);

-- Unique constraint for daily tasks (one completion per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tasks_daily 
ON user_tasks(user_id, task_id, task_date);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(18,6) DEFAULT 50.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Add referral_code column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_connected_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Insert default tasks
INSERT INTO tasks (code, title, description, reward_amount, task_type, requirement_type, requirement_value) VALUES
  ('daily_login', 'Daily Login', 'Open the app once a day', 5.0, 'DAILY', 'LOGIN', 1),
  ('daily_swipe_5', 'Swipe 5 Times', 'Swipe on 5 profiles today', 10.0, 'DAILY', 'SWIPE', 5),
  ('daily_swipe_20', 'Swipe Master', 'Swipe on 20 profiles today', 25.0, 'DAILY', 'SWIPE', 20),
  ('first_match', 'First Match', 'Get your first match', 50.0, 'ONE_TIME', 'MATCH', 1),
  ('first_contract', 'Mint First Contract', 'Mint your first love contract', 100.0, 'ONE_TIME', 'CONTRACT', 1),
  ('connect_wallet', 'Connect Wallet', 'Link your TON wallet', 25.0, 'ONE_TIME', 'WALLET', 1),
  ('jury_duty', 'Jury Duty', 'Vote on a dispute', 10.0, 'DAILY', 'JURY_VOTE', 1),
  ('weekly_10_matches', '10 Matches This Week', 'Get 10 matches in a week', 100.0, 'WEEKLY', 'MATCH', 10)
ON CONFLICT (code) DO NOTHING;
