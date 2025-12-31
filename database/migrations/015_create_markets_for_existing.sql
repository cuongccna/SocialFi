-- ============================================
-- Migration 015: Create prediction markets for existing minted contracts
-- Creates OPEN markets for all relationships that have MINTED_CONTRACT status
-- ============================================

-- Create markets for all minted contracts that don't have one
INSERT INTO prediction_markets (relationship_id, expiry_date, pool_long, pool_short, status)
SELECT 
    r.id,
    NOW() + INTERVAL '30 days',
    0,
    0,
    'OPEN'
FROM relationships r
LEFT JOIN prediction_markets pm ON pm.relationship_id = r.id
WHERE r.status = 'MINTED_CONTRACT'
  AND pm.id IS NULL;

-- Verify
SELECT 
    pm.id as market_id,
    pm.status,
    pm.pool_long,
    pm.pool_short,
    pm.expiry_date,
    u_a.display_name as user_a_name,
    u_b.display_name as user_b_name
FROM prediction_markets pm
JOIN relationships r ON pm.relationship_id = r.id
JOIN users u_a ON r.user_a = u_a.id
JOIN users u_b ON r.user_b = u_b.id
ORDER BY pm.created_at DESC;
