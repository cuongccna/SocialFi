-- Migration: Add disputes and jury_votes tables
-- Jury DAO - Community arbitration for relationship disputes

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  plaintiff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defendant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dispute details
  title VARCHAR(255) NOT NULL,
  evidence_content TEXT NOT NULL,
  defendant_response TEXT,
  
  -- Dispute stakes
  stake_amount DECIMAL(18,6) DEFAULT 50.0,
  
  -- Status and resolution
  status VARCHAR(20) DEFAULT 'VOTING' CHECK (status IN ('VOTING', 'RESOLVED_PLAINTIFF', 'RESOLVED_DEFENDANT', 'DISMISSED')),
  votes_plaintiff INT DEFAULT 0,
  votes_defendant INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Constraints
  CONSTRAINT different_parties CHECK (plaintiff_id != defendant_id)
);

-- Jury votes table
CREATE TABLE IF NOT EXISTS jury_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  juror_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Vote details
  vote_side VARCHAR(20) NOT NULL CHECK (vote_side IN ('PLAINTIFF', 'DEFENDANT')),
  stake_amount DECIMAL(18,6) DEFAULT 5.0,
  
  -- Reward tracking
  reward_earned DECIMAL(18,6) DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per juror per dispute
  UNIQUE(dispute_id, juror_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_expiry ON disputes(expiry_date);
CREATE INDEX IF NOT EXISTS idx_disputes_relationship ON disputes(relationship_id);
CREATE INDEX IF NOT EXISTS idx_jury_votes_dispute ON jury_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_jury_votes_juror ON jury_votes(juror_id);

-- Sample disputes for testing
INSERT INTO disputes (relationship_id, plaintiff_id, defendant_id, title, evidence_content, stake_amount, expiry_date)
SELECT 
  r.id,
  r.user_a,
  r.user_b,
  'Who ghosted first?',
  'I was always the one initiating conversations. They would take days to reply and then blame me for being "too clingy". Classic gaslighting! 😤',
  100.0,
  NOW() + INTERVAL '5 days'
FROM relationships r
WHERE r.status IN ('MATCHED', 'MINTED_CONTRACT')
LIMIT 1
ON CONFLICT DO NOTHING;
