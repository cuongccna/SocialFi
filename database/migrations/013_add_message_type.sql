-- ============================================
-- Migration 013: Add message type column
-- Support for TEXT, IMAGE, STICKER message types
-- ============================================

-- Add type column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'TEXT' 
CHECK (type IN ('TEXT', 'IMAGE', 'STICKER', 'SYSTEM'));

-- Add index for message type
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages (type);

-- Comment
COMMENT ON COLUMN messages.type IS 'Message type: TEXT, IMAGE, STICKER, SYSTEM';
