-- ============================================
-- Migration 008: Yield Farming for Couples
-- Add passive $LOVE accrual for matched couples
-- ============================================

-- Add yield farming columns to relationships
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS last_harvest_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS accrued_love DECIMAL(18, 6) DEFAULT 0.0;

-- Create index for finding harvestable relationships
CREATE INDEX IF NOT EXISTS idx_relationships_last_harvest 
ON relationships (last_harvest_at);

CREATE INDEX IF NOT EXISTS idx_relationships_status_harvest 
ON relationships (status, last_harvest_at) 
WHERE status IN ('MATCHED', 'MINTED_CONTRACT');

-- Comment on columns
COMMENT ON COLUMN relationships.last_harvest_at IS 'Last time the couple harvested their accrued $LOVE';
COMMENT ON COLUMN relationships.accrued_love IS 'Accumulated $LOVE waiting to be harvested (10 $LOVE/hour)';

-- Update existing relationships to have a harvest timestamp
UPDATE relationships 
SET last_harvest_at = COALESCE(last_harvest_at, start_date, NOW())
WHERE last_harvest_at IS NULL;
