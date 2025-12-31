/**
 * Check Feed Status
 * Run this on server to diagnose feed issues
 */

require('dotenv').config();
const { query } = require('../src/config/db');

async function checkFeedStatus() {
  console.log('\n=== FEED STATUS CHECK ===\n');
  
  try {
    // 1. Total active users
    const usersRes = await query('SELECT COUNT(*) as cnt FROM users WHERE is_active = TRUE');
    console.log(`Total Active Users: ${usersRes.rows[0].cnt}`);
    
    // 2. Total swipes by action
    const swipesRes = await query('SELECT action, COUNT(*)::int as cnt FROM swipes GROUP BY action');
    console.log('\nSwipes by Action:');
    swipesRes.rows.forEach(r => console.log(`  ${r.action}: ${r.cnt}`));
    
    // 3. Top 5 users who swiped the most
    const topSwipersRes = await query(`
      SELECT 
        u.telegram_id, 
        u.username,
        COUNT(*)::int as swiped_count,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND id != u.id) - COUNT(*)::int as remaining
      FROM swipes s
      JOIN users u ON u.id = s.actor_id
      GROUP BY u.id
      ORDER BY swiped_count DESC
      LIMIT 10
    `);
    console.log('\nTop 10 Swipers:');
    topSwipersRes.rows.forEach(r => {
      console.log(`  @${r.username || r.telegram_id}: ${r.swiped_count} swiped, ${r.remaining} remaining`);
    });
    
    // 4. Users who have swiped everyone
    const noMoreRes = await query(`
      SELECT 
        u.telegram_id,
        u.username,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = u.id AND action = 'PASS') as pass_count
      FROM users u
      WHERE (
        SELECT COUNT(*) FROM users WHERE is_active = TRUE AND id != u.id
      ) <= (
        SELECT COUNT(*) FROM swipes WHERE actor_id = u.id
      )
    `);
    console.log(`\nUsers who swiped everyone: ${noMoreRes.rows.length}`);
    noMoreRes.rows.slice(0, 5).forEach(r => {
      console.log(`  @${r.username || r.telegram_id}: ${r.pass_count} can be resurrected`);
    });
    
    // 5. Check if resurrection should work
    console.log('\n=== RESURRECTION CHECK ===');
    const passesRes = await query('SELECT COUNT(*)::int as cnt FROM swipes WHERE action = $1', ['PASS']);
    console.log(`Total PASS swipes that can be resurrected: ${passesRes.rows[0].cnt}`);
    
    console.log('\n=== DONE ===\n');
    
  } catch (err) {
    console.error('Error:', err);
  }
  
  process.exit(0);
}

checkFeedStatus();
