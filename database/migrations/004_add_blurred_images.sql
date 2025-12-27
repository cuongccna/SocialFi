-- Migration: Add blurred_images table for Blur-to-Earn feature
-- Images sent in chat are blurred by default, recipients pay $LOVE to unblur

CREATE TABLE IF NOT EXISTS blurred_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Image data
  original_url TEXT NOT NULL,
  blurred_url TEXT NOT NULL,
  
  -- Pricing
  unblur_cost DECIMAL(18,6) DEFAULT 10.0,
  
  -- Status
  is_unblurred BOOLEAN DEFAULT FALSE,
  unblurred_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blurred_images_relationship ON blurred_images(relationship_id);
CREATE INDEX IF NOT EXISTS idx_blurred_images_recipient ON blurred_images(recipient_id);
CREATE INDEX IF NOT EXISTS idx_blurred_images_unblurred ON blurred_images(is_unblurred);
