-- Seed matches for real Telegram user
-- Run: psql -U CryptoCrush_user -d CryptoCrush_db -f database/seed_real_matches.sql

-- Variables
DO $$
DECLARE
  real_user_id UUID := '4bad7d95-0766-48f8-9623-fe2228106ecc';
  partner1_id UUID;
  partner2_id UUID;
  rel1_id UUID;
  rel2_id UUID;
BEGIN
  -- Get 2 seed users
  SELECT id INTO partner1_id FROM users WHERE telegram_id NOT IN (7599130386, 12345678) LIMIT 1;
  SELECT id INTO partner2_id FROM users WHERE telegram_id NOT IN (7599130386, 12345678) AND id != partner1_id LIMIT 1;
  
  RAISE NOTICE 'Real user: %', real_user_id;
  RAISE NOTICE 'Partner 1: %', partner1_id;
  RAISE NOTICE 'Partner 2: %', partner2_id;
  
  -- Create swipes
  INSERT INTO swipes (actor_id, target_id, action) VALUES (real_user_id, partner1_id, 'LIKE') ON CONFLICT DO NOTHING;
  INSERT INTO swipes (actor_id, target_id, action) VALUES (partner1_id, real_user_id, 'LIKE') ON CONFLICT DO NOTHING;
  INSERT INTO swipes (actor_id, target_id, action) VALUES (real_user_id, partner2_id, 'LIKE') ON CONFLICT DO NOTHING;
  INSERT INTO swipes (actor_id, target_id, action) VALUES (partner2_id, real_user_id, 'LIKE') ON CONFLICT DO NOTHING;
  
  -- Create relationships
  INSERT INTO relationships (user_a, user_b, status, start_date) 
  VALUES (real_user_id, partner1_id, 'MINTED_CONTRACT', NOW())
  ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING
  RETURNING id INTO rel1_id;
  
  INSERT INTO relationships (user_a, user_b, status, start_date) 
  VALUES (real_user_id, partner2_id, 'MATCHED', NOW())
  ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING
  RETURNING id INTO rel2_id;
  
  -- Add messages if relationships created
  IF rel1_id IS NOT NULL THEN
    INSERT INTO messages (relationship_id, sender_id, content) VALUES 
      (rel1_id, real_user_id, 'Hey! Nice to meet you! 👋'),
      (rel1_id, partner1_id, 'Hi there! Love your profile! 💚');
    RAISE NOTICE 'Created relationship 1 with messages';
  ELSE
    RAISE NOTICE 'Relationship 1 already exists';
  END IF;
  
  IF rel2_id IS NOT NULL THEN
    INSERT INTO messages (relationship_id, sender_id, content) VALUES 
      (rel2_id, partner2_id, 'Hello! Whats up? 🚀');
    RAISE NOTICE 'Created relationship 2 with messages';
  ELSE
    RAISE NOTICE 'Relationship 2 already exists';
  END IF;
  
END $$;

-- Verify
SELECT 
  r.id,
  r.status,
  u_a.telegram_id as user_a_tg,
  u_b.telegram_id as user_b_tg
FROM relationships r
JOIN users u_a ON r.user_a = u_a.id
JOIN users u_b ON r.user_b = u_b.id
WHERE u_a.telegram_id = 7599130386 OR u_b.telegram_id = 7599130386;
