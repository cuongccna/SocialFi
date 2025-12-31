-- ============================================
-- CryptoCrush - Database Migration 014
-- Add Love Contract NFT fields
-- ============================================

-- Add NFT-related columns to relationships table
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS nft_image_url TEXT,
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS block_height BIGINT,
ADD COLUMN IF NOT EXISTS gas_fee DECIMAL(18, 6) DEFAULT 500.0,
ADD COLUMN IF NOT EXISTS nft_metadata JSONB;

-- Add index for tx_hash lookups
CREATE INDEX IF NOT EXISTS idx_relationships_tx_hash ON relationships (tx_hash);

-- Comment on columns
COMMENT ON COLUMN relationships.nft_image_url IS 'URL path to generated certificate image';
COMMENT ON COLUMN relationships.tx_hash IS 'Mock blockchain transaction hash for the minted contract';
COMMENT ON COLUMN relationships.block_height IS 'Mock block height at minting time';
COMMENT ON COLUMN relationships.gas_fee IS 'Cost in $LOVE to mint the contract';
COMMENT ON COLUMN relationships.nft_metadata IS 'Additional NFT metadata as JSON';
