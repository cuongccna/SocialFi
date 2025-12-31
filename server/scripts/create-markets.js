/**
 * Create prediction markets for all existing minted relationships
 */
require('dotenv').config();
const { pool } = require('../src/config/db');

async function main() {
  try {
    console.log('🔍 Finding minted relationships without markets...\n');

    // Create markets for all minted contracts that don't have one
    const result = await pool.query(`
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
        AND pm.id IS NULL
      RETURNING id, relationship_id
    `);
    
    console.log(`✅ Created ${result.rowCount} new prediction markets\n`);
    
    // Count total markets
    const count = await pool.query('SELECT COUNT(*) as total FROM prediction_markets');
    console.log(`📊 Total markets now: ${count.rows[0].total}\n`);
    
    // Show all markets
    const markets = await pool.query(`
      SELECT 
          pm.id,
          pm.status,
          pm.pool_long,
          pm.pool_short,
          u_a.display_name as user_a,
          u_b.display_name as user_b
      FROM prediction_markets pm
      JOIN relationships r ON pm.relationship_id = r.id
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      ORDER BY pm.created_at DESC
    `);
    
    console.log('📈 All Markets:');
    console.log('─'.repeat(60));
    markets.rows.forEach((m, i) => {
      const pool = Number(m.pool_long) + Number(m.pool_short);
      console.log(`${i+1}. ${m.user_a} ❤️ ${m.user_b}`);
      console.log(`   Status: ${m.status} | Pool: ${pool} $LOVE`);
    });
    
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
