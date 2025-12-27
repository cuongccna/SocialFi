-- ============================================
-- CryptoCrush - SocialFi Dating Telegram Mini App
-- Database Migration Script v1.1 (No PostGIS)
-- PostgreSQL - Compatible without PostGIS extension
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Try to enable PostGIS (optional - will skip if not available)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- A. Core User & Assets
-- ============================================

-- Users table (Profile = Token)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    
    -- Location (Simple lat/lng for compatibility without PostGIS)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Wallet & Rank
    wallet_address VARCHAR(255),
    wallet_rank VARCHAR(20) DEFAULT 'SHRIMP' CHECK (wallet_rank IN ('WHALE', 'SHARK', 'SHRIMP')),
    
    -- Market Cap Simulation
    market_price FLOAT DEFAULT 10.0,
    price_change_24h FLOAT DEFAULT 0.0,
    
    -- Internal Token Balance
    balance_love DECIMAL(18, 6) DEFAULT 0.0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users (wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_market_price ON users (market_price DESC);
CREATE INDEX IF NOT EXISTS idx_users_location ON users (latitude, longitude);

-- ============================================
-- B. Dating & Matching
-- ============================================

-- Swipes table (Trading actions)
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL CHECK (action IN ('LIKE', 'PASS', 'SUPER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate swipes
    CONSTRAINT unique_swipe UNIQUE (actor_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_actor ON swipes (actor_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes (target_id);
CREATE INDEX IF NOT EXISTS idx_swipes_action ON swipes (action);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON swipes (created_at DESC);

-- Relationships table (Matches = Contracts)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contract status
    status VARCHAR(20) DEFAULT 'MATCHED' CHECK (status IN ('MATCHED', 'MINTED_CONTRACT', 'BURNED_CONTRACT')),
    
    -- Contract details (simulated for MVP)
    contract_address VARCHAR(255),
    contract_minted_at TIMESTAMP WITH TIME ZONE,
    contract_burned_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure different users
    CONSTRAINT different_users CHECK (user_a != user_b)
);

-- Unique index for order-independent pair (works in all PostgreSQL versions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_relationship_pair 
ON relationships (LEAST(user_a, user_b), GREATEST(user_a, user_b));

CREATE INDEX IF NOT EXISTS idx_relationships_user_a ON relationships (user_a);
CREATE INDEX IF NOT EXISTS idx_relationships_user_b ON relationships (user_b);
CREATE INDEX IF NOT EXISTS idx_relationships_status ON relationships (status);

-- ============================================
-- C. SocialFi Modules (The "Crazy" Features)
-- ============================================

-- Prediction Markets table (Betting on relationships)
CREATE TABLE IF NOT EXISTS prediction_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    
    -- Market details
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Betting pools
    pool_long DECIMAL(18, 6) DEFAULT 0.0,  -- Bet on relationship lasting
    pool_short DECIMAL(18, 6) DEFAULT 0.0, -- Bet on breakup
    
    -- Market status
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PAYOUT_LONG', 'PAYOUT_SHORT')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- One market per relationship
    CONSTRAINT unique_market_per_relationship UNIQUE (relationship_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_markets_relationship ON prediction_markets (relationship_id);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON prediction_markets (status);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_expiry ON prediction_markets (expiry_date);

-- Bets table (User positions in prediction markets)
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    
    -- Position
    position VARCHAR(10) NOT NULL CHECK (position IN ('LONG', 'SHORT')),
    amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
    
    -- Payout tracking
    is_settled BOOLEAN DEFAULT FALSE,
    payout_amount DECIMAL(18, 6) DEFAULT 0.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One position per user per market
    CONSTRAINT unique_bet_per_user_market UNIQUE (user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets (user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets (market_id);
CREATE INDEX IF NOT EXISTS idx_bets_position ON bets (position);

-- Disputes table (Jury DAO cases)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    
    -- Parties
    plaintiff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    defendant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Case details
    title VARCHAR(255),
    evidence_content TEXT NOT NULL,
    
    -- Voting
    status VARCHAR(20) DEFAULT 'VOTING' CHECK (status IN ('VOTING', 'RESOLVED_PLAINTIFF', 'RESOLVED_DEFENDANT', 'DISMISSED')),
    votes_plaintiff INT DEFAULT 0,
    votes_defendant INT DEFAULT 0,
    
    -- Voting window
    voting_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT different_parties CHECK (plaintiff_id != defendant_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_relationship ON disputes (relationship_id);
CREATE INDEX IF NOT EXISTS idx_disputes_plaintiff ON disputes (plaintiff_id);
CREATE INDEX IF NOT EXISTS idx_disputes_defendant ON disputes (defendant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_voting_ends ON disputes (voting_ends_at);

-- Jury Votes table (DAO voting mechanism)
CREATE TABLE IF NOT EXISTS jury_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    juror_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vote decision (swipe left = plaintiff, swipe right = defendant)
    vote_side VARCHAR(20) NOT NULL CHECK (vote_side IN ('PLAINTIFF', 'DEFENDANT')),
    
    -- Reward tracking
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_amount DECIMAL(18, 6) DEFAULT 0.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One vote per juror per dispute
    CONSTRAINT unique_vote_per_juror UNIQUE (dispute_id, juror_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_votes_dispute ON jury_votes (dispute_id);
CREATE INDEX IF NOT EXISTS idx_jury_votes_juror ON jury_votes (juror_id);
CREATE INDEX IF NOT EXISTS idx_jury_votes_side ON jury_votes (vote_side);

-- ============================================
-- Helper Functions & Triggers
-- ============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (for re-running migration)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
DROP TRIGGER IF EXISTS update_prediction_markets_updated_at ON prediction_markets;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
    BEFORE UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prediction_markets_updated_at
    BEFORE UPDATE ON prediction_markets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Function: Calculate distance (Haversine formula)
-- Since we're not using PostGIS, we need this for geo queries
-- ============================================

CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371; -- Earth's radius in km
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    a := SIN(dlat / 2) * SIN(dlat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dlon / 2) * SIN(dlon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Useful Views
-- ============================================

-- Drop existing views if they exist (for re-running migration)
DROP VIEW IF EXISTS active_markets_view;
DROP VIEW IF EXISTS user_leaderboard_view;

-- View: Active markets with pool totals
CREATE VIEW active_markets_view AS
SELECT 
    pm.id AS market_id,
    r.id AS relationship_id,
    ua.display_name AS user_a_name,
    ub.display_name AS user_b_name,
    pm.expiry_date,
    pm.pool_long,
    pm.pool_short,
    (pm.pool_long + pm.pool_short) AS total_pool,
    CASE 
        WHEN (pm.pool_long + pm.pool_short) > 0 
        THEN ROUND((pm.pool_long / (pm.pool_long + pm.pool_short) * 100)::numeric, 2)
        ELSE 50.0 
    END AS long_percentage
FROM prediction_markets pm
JOIN relationships r ON pm.relationship_id = r.id
JOIN users ua ON r.user_a = ua.id
JOIN users ub ON r.user_b = ub.id
WHERE pm.status = 'OPEN';

-- View: User leaderboard by market price
CREATE VIEW user_leaderboard_view AS
SELECT 
    id,
    telegram_id,
    display_name,
    wallet_rank,
    market_price,
    price_change_24h,
    balance_love,
    RANK() OVER (ORDER BY market_price DESC) AS rank
FROM users
WHERE is_active = TRUE
ORDER BY market_price DESC;

-- ============================================
-- Sample Query: Find users within X km radius
-- Using Haversine function instead of PostGIS
-- ============================================
/*
SELECT 
    u.*,
    calculate_distance_km($2, $3, u.latitude, u.longitude) AS distance_km
FROM users u
WHERE u.id != $1  -- exclude self
  AND u.is_active = TRUE
  AND u.latitude IS NOT NULL
  AND u.longitude IS NOT NULL
  AND calculate_distance_km($2, $3, u.latitude, u.longitude) <= $4  -- radius in km
  AND u.id NOT IN (
      SELECT target_id FROM swipes WHERE actor_id = $1
  )
ORDER BY 
    u.market_price DESC,
    calculate_distance_km($2, $3, u.latitude, u.longitude) ASC
LIMIT 20;
*/

-- ============================================
-- End of Migration
-- ============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ CryptoCrush database migration completed successfully!';
    RAISE NOTICE '📊 Tables created: users, swipes, relationships, prediction_markets, bets, disputes, jury_votes';
    RAISE NOTICE '🔧 Functions: update_updated_at_column, calculate_distance_km';
    RAISE NOTICE '📈 Views: active_markets_view, user_leaderboard_view';
END $$;
