-- Migration: Add joint_balance to relationships table
-- Joint Venture: Chat-to-Earn feature for couples

-- Add joint_balance column to relationships table
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS joint_balance DECIMAL(18,6) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN relationships.joint_balance IS 'Shared $LOVE balance earned through chat interactions. +0.1 $LOVE per message.';

-- Create index for efficient queries on joint_balance
CREATE INDEX IF NOT EXISTS idx_relationships_joint_balance ON relationships (joint_balance DESC);
