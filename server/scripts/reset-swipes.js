/**
 * Reset Swipes Script
 * Clear swipes for a specific user (for testing)
 * 
 * Usage: node scripts/reset-swipes.js <telegram_id>
 */

const { pool } = require('../src/config/db');

async function resetSwipes() {
  const telegramId = process.argv[2];
  
  if (!telegramId) {
    console.log('Usage: node scripts/reset-swipes.js <telegram_id>');
    console.log('Example: node scripts/reset-swipes.js 123456789');
    process.exit(1);
  }
  
  try {
    // Find user
    const userResult = await pool.query(
      'SELECT id, display_name FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found with telegram_id:', telegramId);
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log(`👤 Found user: ${user.display_name} (${user.id})`);
    
    // Count swipes
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM swipes WHERE actor_id = $1',
      [user.id]
    );
    const swipeCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Current swipes: ${swipeCount}`);
    
    // Delete PASS swipes (keep LIKE swipes to preserve matches)
    const deleteResult = await pool.query(
      `DELETE FROM swipes WHERE actor_id = $1 AND action = 'PASS' RETURNING id`,
      [user.id]
    );
    
    console.log(`✅ Deleted ${deleteResult.rowCount} PASS swipes`);
    console.log('💡 LIKE swipes preserved to keep matches');
    
    // Show remaining
    const remainingResult = await pool.query(
      'SELECT COUNT(*) as count FROM swipes WHERE actor_id = $1',
      [user.id]
    );
    console.log(`📊 Remaining swipes: ${remainingResult.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetSwipes();
