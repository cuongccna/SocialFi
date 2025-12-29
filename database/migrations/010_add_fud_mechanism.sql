-- ============================================
-- Migration 010: FUD (Fear, Uncertainty, Doubt) Mechanism
-- Allow matched users to FUD each other (once per 24h per match)
-- ============================================

-- FUD reports table to track cooldowns
CREATE TABLE IF NOT EXISTS fud_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
    price_before FLOAT NOT NULL,
    price_after FLOAT NOT NULL,
    price_drop_percent FLOAT NOT NULL DEFAULT 15.0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fud_reports_reporter ON fud_reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_fud_reports_target ON fud_reports (target_id);
CREATE INDEX IF NOT EXISTS idx_fud_reports_relationship ON fud_reports (relationship_id);
CREATE INDEX IF NOT EXISTS idx_fud_reports_created_at ON fud_reports (created_at DESC);

-- Composite index for cooldown check (one FUD per match per 24h)
CREATE INDEX IF NOT EXISTS idx_fud_reports_cooldown 
ON fud_reports (reporter_id, target_id, created_at DESC);

-- Comments
COMMENT ON TABLE fud_reports IS 'Tracks FUD reports between matched users with 24h cooldown';
COMMENT ON COLUMN fud_reports.reporter_id IS 'User who initiated the FUD';
COMMENT ON COLUMN fud_reports.target_id IS 'User who received the FUD (price dump)';
COMMENT ON COLUMN fud_reports.price_drop_percent IS 'Percentage drop applied (default 15%)';
