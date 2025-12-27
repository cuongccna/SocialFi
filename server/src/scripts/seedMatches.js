/**
 * Seed Matches Script
 * Creates test relationships and messages for development
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const pool = require('../config/db');

async function seedMatches() {
  console.log('🌱 Seeding test matches...\n');

  try {
    // Get or create mock user (the one from dev mode)
    let mockUser = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [12345678]
    );

    if (mockUser.rows.length === 0) {
      // Create mock user
      const result = await pool.query(`
        INSERT INTO users (telegram_id, username, display_name, bio, avatar_url, market_price, balance_love, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        12345678,
        'test_user',
        'Test User 🧪',
        'Testing the CryptoCrush app!',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
        25.50,
        500,
        10.8231,
        106.6297
      ]);
      mockUser = { rows: [{ id: result.rows[0].id }] };
      console.log('✅ Created mock user');
    }

    const mockUserId = mockUser.rows[0].id;
    console.log(`📌 Mock User ID: ${mockUserId}`);

    // Get some seed users to match with
    const seedUsers = await pool.query(`
      SELECT id, display_name FROM users 
      WHERE telegram_id != 12345678 
      LIMIT 3
    `);

    if (seedUsers.rows.length === 0) {
      console.log('❌ No seed users found. Run seed.js first.');
      return;
    }

    console.log(`\n📋 Found ${seedUsers.rows.length} users to match with\n`);

    // Create relationships
    for (let i = 0; i < seedUsers.rows.length; i++) {
      const partner = seedUsers.rows[i];
      
      // Check if relationship exists
      const existing = await pool.query(`
        SELECT id FROM relationships 
        WHERE (user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1)
      `, [mockUserId, partner.id]);

      if (existing.rows.length > 0) {
        console.log(`⏭️  Already matched with user ${i + 1}`);
        continue;
      }

      // Create mutual swipes first
      await pool.query(`
        INSERT INTO swipes (actor_id, target_id, action)
        VALUES ($1, $2, 'LIKE')
        ON CONFLICT DO NOTHING
      `, [mockUserId, partner.id]);

      await pool.query(`
        INSERT INTO swipes (actor_id, target_id, action)
        VALUES ($1, $2, 'LIKE')
        ON CONFLICT DO NOTHING
      `, [partner.id, mockUserId]);

      // Create relationship
      const status = i === 0 ? 'MINTED_CONTRACT' : 'MATCHED';
      const contractAddress = i === 0 ? '0x' + Buffer.from(partner.id).toString('hex').slice(0, 40) : null;
      
      const relationship = await pool.query(`
        INSERT INTO relationships (user_a, user_b, status, contract_address, start_date)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING
        RETURNING id
      `, [mockUserId, partner.id, status, contractAddress]);

      if (relationship.rows.length > 0) {
        console.log(`💕 Created match #${i + 1} with status: ${status}`);

        // Add some test messages
        const relationshipId = relationship.rows[0].id;
        
        await pool.query(`
          INSERT INTO messages (relationship_id, sender_id, content)
          VALUES 
            ($1, $2, 'Hey! Nice to match with you! 👋'),
            ($1, $3, 'Hi there! Love your profile 💚'),
            ($1, $2, 'Thanks! What brings you to CryptoCrush?'),
            ($1, $3, 'Looking for my crypto soulmate 😄')
        `, [relationshipId, mockUserId, partner.id]);

        console.log(`   💬 Added 4 test messages`);
      }
    }

    // Create a prediction market for the minted relationship
    const mintedRelationship = await pool.query(`
      SELECT r.id FROM relationships r
      JOIN users u ON (r.user_a = u.id OR r.user_b = u.id)
      WHERE u.telegram_id = 12345678 AND r.status = 'MINTED_CONTRACT'
      LIMIT 1
    `);

    if (mintedRelationship.rows.length > 0) {
      const relId = mintedRelationship.rows[0].id;
      
      // Check if market exists
      const existingMarket = await pool.query(
        'SELECT id FROM prediction_markets WHERE relationship_id = $1',
        [relId]
      );

      if (existingMarket.rows.length === 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        await pool.query(`
          INSERT INTO prediction_markets (relationship_id, expiry_date, pool_long, pool_short)
          VALUES ($1, $2, 150, 75)
        `, [relId, expiryDate]);

        console.log(`\n📊 Created prediction market for minted relationship`);
      }
    }

    console.log('\n✅ Seed matches complete!\n');
    console.log('📱 Now open the app and go to Matches tab to see the chat buttons');

  } catch (err) {
    console.error('❌ Error seeding matches:', err);
  } finally {
    await pool.end();
  }
}

seedMatches();
