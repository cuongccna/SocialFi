-- Migration: 016_add_game_stats.sql
-- Description: Add user_game_stats table for Game Arcade feature
-- Created: 2026-01-03

-- ============================================
-- USER GAME STATS TABLE
-- Tracks user's game tickets, scores, and progress
-- ============================================

CREATE TABLE IF NOT EXISTS user_game_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ticket System (3 free tickets per day)
    daily_tickets INTEGER NOT NULL DEFAULT 3,
    last_ticket_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Score Tracking
    total_score BIGINT NOT NULL DEFAULT 0,
    
    -- Game-specific high scores
    kyp_high_score INTEGER DEFAULT 0,           -- Know Your Partner game
    mining_high_score INTEGER DEFAULT 0,        -- Love Mining game
    candle_kiss_high_score INTEGER DEFAULT 0,   -- Candle Kiss game
    
    -- Streak tracking (for game unlocks)
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_play_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_total_score ON user_game_stats(total_score DESC);

-- ============================================
-- GAME SESSION HISTORY
-- Track individual game plays for analytics
-- ============================================

CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Game info
    game_type VARCHAR(50) NOT NULL, -- 'KYP', 'MINING', 'CANDLE_KISS'
    score INTEGER NOT NULL DEFAULT 0,
    
    -- Partner (for co-op games)
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session metadata
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    
    -- Rewards earned
    love_earned NUMERIC(18, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- ============================================
-- FUNCTION: Reset daily tickets at midnight
-- ============================================

CREATE OR REPLACE FUNCTION reset_daily_tickets()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if last reset was before today
    IF NEW.last_ticket_reset::date < CURRENT_DATE THEN
        NEW.daily_tickets := 3;
        NEW.last_ticket_reset := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Auto-create game stats for new users
-- ============================================

CREATE OR REPLACE FUNCTION create_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_game_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS trigger_create_user_game_stats ON users;
CREATE TRIGGER trigger_create_user_game_stats
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_game_stats();

-- ============================================
-- Initialize game stats for existing users
-- ============================================

INSERT INTO user_game_stats (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_game_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Add streak column to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'login_streak'
    ) THEN
        ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0;
    END IF;
END $$;

COMMENT ON TABLE user_game_stats IS 'Tracks user game progress, tickets, and scores for the Game Arcade';
COMMENT ON TABLE game_sessions IS 'History of individual game plays for analytics and leaderboards';
