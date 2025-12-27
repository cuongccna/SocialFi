-- ============================================
-- CryptoCrush - Messages Migration
-- Add messages table for chat between matches
-- ============================================

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_relationship ON messages (relationship_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (relationship_id, sender_id, is_read) WHERE is_read = FALSE;
