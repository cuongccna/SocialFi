/**
 * Seed More Fake Users Script
 * Create additional test users for feed
 * 
 * Usage: node scripts/seed-more-users.js [count]
 * Example: node scripts/seed-more-users.js 50
 */

require('dotenv').config();
const { pool } = require('../src/config/db');

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Parker', 'Skyler', 
  'Drew', 'Jamie', 'Reese', 'Finley', 'Sage', 'River', 'Phoenix', 'Rowan', 'Eden', 'Blake',
  'Cameron', 'Dakota', 'Emery', 'Harper', 'Hayden', 'Jesse', 'Kelly', 'Lane', 'Logan', 'Max',
  'Nico', 'Oakley', 'Peyton', 'Remi', 'Sam', 'Sydney', 'Tatum', 'Val', 'Winter', 'Zion'];

const LAST_NAMES = ['Nakamoto', 'Buterin', 'Wood', 'Sun', 'Zhao', 'Armstrong', 'Saylor', 'Hoskinson', 
  'Di Iorio', 'Winklevoss', 'Dorsey', 'Cuban', 'Musk', 'Larsen', 'McCaleb', 'Lee', 'Ver',
  'Novogratz', 'Silbert', 'Draper', 'Powell', 'Lubin', 'Bankman', 'Kwon', 'Do'];

const BIOS = [
  '🚀 To the moon or bust! HODL gang',
  '💎 Diamond hands only. No paper hands here',
  '📈 DeFi degen | Yield farmer | NFT collector',
  '🐋 Whale watching enthusiast',
  '⚡ Lightning fast trades | 100x or nothing',
  '🌙 Night trader | Coffee addict | Chart wizard',
  '💰 Building generational wealth one block at a time',
  '🔥 FOMO is my middle name',
  '🎯 Precision trading | Risk management expert',
  '🌊 Riding the waves of volatility',
  '🦍 Ape together strong 🍌',
  '📊 Technical analysis nerd | Pattern recognition',
  '💸 Making money while you sleep',
  '🎰 High risk, high reward lifestyle',
  '🔮 Crypto psychic | Always bullish',
];

const RANKS = ['SHRIMP', 'SHRIMP', 'SHRIMP', 'SHARK', 'SHARK', 'WHALE'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice() {
  // Random price between $5 and $5000
  return (Math.random() * 4995 + 5).toFixed(2);
}

function randomPriceChange() {
  // Random change between -30% and +50%
  return (Math.random() * 80 - 30).toFixed(2);
}

function randomBalance() {
  // Random balance between 100 and 50000
  return Math.floor(Math.random() * 49900 + 100);
}

function randomCoords() {
  // Random coords around HCMC area
  const lat = 10.7 + Math.random() * 0.3; // 10.7 - 11.0
  const lng = 106.5 + Math.random() * 0.4; // 106.5 - 106.9
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

async function seedUsers() {
  const count = parseInt(process.argv[2]) || 20;
  
  console.log(`🌱 Seeding ${count} new fake users...`);
  
  try {
    let created = 0;
    
    for (let i = 0; i < count; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const displayName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now() % 10000}`;
      const telegramId = `fake_${Date.now()}_${i}`;
      const coords = randomCoords();
      
      try {
        await pool.query(`
          INSERT INTO users (
            telegram_id, username, display_name, bio,
            wallet_rank, market_price, price_change_24h, balance_love,
            latitude, longitude, is_active, last_active_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW() - INTERVAL '${Math.floor(Math.random() * 60)} minutes')
        `, [
          telegramId,
          username,
          displayName,
          randomElement(BIOS),
          randomElement(RANKS),
          randomPrice(),
          randomPriceChange(),
          randomBalance(),
          coords.lat,
          coords.lng,
        ]);
        
        created++;
        process.stdout.write(`\r✅ Created ${created}/${count} users`);
      } catch (err) {
        // Skip if duplicate
        if (!err.message.includes('duplicate')) {
          console.error(`\n❌ Error creating user: ${err.message}`);
        }
      }
    }
    
    console.log(`\n\n🎉 Successfully created ${created} new users!`);
    
    // Show total count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
    console.log(`📊 Total active users in database: ${totalResult.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedUsers();
