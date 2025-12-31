/**
 * Reset Swipes Script
 * Clear swipes for a specific user (for testing)
 * 
 * Usage: node scripts/reset-swipes.js <telegram_id>
 */

// Load environment variables
require('dotenv').config();

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
    
    // Check for --all flag
    const resetAll = process.argv[3] === '--all';
    
    if (resetAll) {
      // Delete ALL swipes (including LIKE - will break matches!)
      const deleteResult = await pool.query(
        `DELETE FROM swipes WHERE actor_id = $1 RETURNING id`,
        [user.id]
      );
      console.log(`⚠️  Deleted ALL ${deleteResult.rowCount} swipes (including LIKE)`);
      console.log('🔥 Warning: This may affect existing matches!');
    } else {
      // Delete only PASS swipes (keep LIKE swipes to preserve matches)
      const deleteResult = await pool.query(
        `DELETE FROM swipes WHERE actor_id = $1 AND action = 'PASS' RETURNING id`,
        [user.id]
      );
      console.log(`✅ Deleted ${deleteResult.rowCount} PASS swipes`);
      console.log('💡 LIKE swipes preserved to keep matches');
      console.log('💡 Use --all flag to reset ALL swipes: node scripts/reset-swipes.js <id> --all');
    }
    
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
