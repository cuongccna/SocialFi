-- ============================================
-- Migration 007: Add price_history table for charts
-- Tracks historical prices for user market cap visualization
-- ============================================

-- Price history table for charting
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price FLOAT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_price_history_user_id ON price_history (user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_user_time ON price_history (user_id, recorded_at DESC);

-- Comment on table
COMMENT ON TABLE price_history IS 'Historical price data for user market cap charts';
COMMENT ON COLUMN price_history.user_id IS 'Reference to the user whose price is recorded';
COMMENT ON COLUMN price_history.price IS 'Market price at the time of recording';
COMMENT ON COLUMN price_history.recorded_at IS 'Timestamp when the price was recorded';

-- Create helper function to get chart data for a user
CREATE OR REPLACE FUNCTION get_user_chart_data(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS FLOAT[] AS $$
DECLARE
    result FLOAT[];
BEGIN
    SELECT ARRAY_AGG(price ORDER BY recorded_at ASC)
    INTO result
    FROM (
        SELECT price, recorded_at
        FROM price_history
        WHERE user_id = p_user_id
        ORDER BY recorded_at DESC
        LIMIT p_limit
    ) sub;
    
    RETURN COALESCE(result, ARRAY[]::FLOAT[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_chart_data IS 'Get last N prices for a user, ordered by time ascending for charting';
