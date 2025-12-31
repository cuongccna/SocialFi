/**
 * Check specific user - Debug
 * Run: node scripts/check-user.js <username>
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkUser() {
  const username = process.argv[2] || 'San_Keo_Tinh_Hoa';
  
  console.log(`\nChecking user: ${username}\n`);
  
  // Find user
  const userResult = await pool.query(`
    SELECT id, telegram_id, username, display_name 
    FROM users 
    WHERE username = $1 OR username = '@' || $1
  `, [username.replace('@', '')]);
  
  if (userResult.rows.length === 0) {
    console.log('User not found!');
    await pool.end();
    return;
  }
  
  const user = userResult.rows[0];
  console.log('User:', user);
  
  // Swipes by action
  const swipes = await pool.query(`
    SELECT action, COUNT(*) as count 
    FROM swipes 
    WHERE actor_id = $1 
    GROUP BY action
  `, [user.id]);
  console.log('\nSwipes by action:');
  swipes.rows.forEach(r => console.log(`  ${r.action}: ${r.count}`));
  
  // Available to swipe (not swiped yet)
  const available = await pool.query(`
    SELECT COUNT(*) as count 
    FROM users u
    WHERE u.id != $1 
      AND u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM swipes s 
        WHERE s.actor_id = $1 AND s.target_id = u.id
      )
  `, [user.id]);
  console.log('\nAvailable to swipe:', available.rows[0].count);
  
  // PASS swipes that can be resurrected
  const passes = await pool.query(`
    SELECT COUNT(*) as count 
    FROM swipes s
    INNER JOIN users u ON u.id = s.target_id
    WHERE s.actor_id = $1 
      AND s.action = 'PASS'
      AND u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM relationships r
        WHERE (r.user_a = $1 AND r.user_b = s.target_id)
           OR (r.user_b = $1 AND r.user_a = s.target_id)
      )
  `, [user.id]);
  console.log('PASS swipes (can resurrect):', passes.rows[0].count);
  
  // Test: Delete PASS swipes and check
  console.log('\n--- Simulating Resurrection ---');
  const passedUserIds = await pool.query(`
    SELECT s.target_id, u.username, u.display_name
    FROM swipes s
    INNER JOIN users u ON u.id = s.target_id
    WHERE s.actor_id = $1 
      AND s.action = 'PASS'
      AND u.is_active = TRUE
    ORDER BY s.created_at ASC
    LIMIT 5
  `, [user.id]);
  
  console.log('First 5 PASS users to resurrect:');
  passedUserIds.rows.forEach(r => console.log(`  - ${r.display_name || r.username}`));
  
  await pool.end();
}

checkUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
