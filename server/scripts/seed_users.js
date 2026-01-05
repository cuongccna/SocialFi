/**
 * Seed Users Script
 * Creates 10 realistic test users in the PostgreSQL database
 * 
 * Usage: node server/scripts/seed_users.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'CryptoCrush_db',
  user: process.env.DB_USER || 'CryptoCrush_user',
  password: process.env.DB_PASSWORD || 'Cuongnv@123',
});

// Realistic test data
const USERS = [
  {
    display_name: 'Satoshi Whale 🐋',
    username: 'satoshi_whale',
    bio: '💎 Diamond hands since 2009. HODL or die! Building generational wealth one block at a time.',
    wallet_rank: 'WHALE',
    market_price: 5000.00,
    price_change_24h: 15.5,
    balance_love: 100000,
    job_title: 'Bitcoin Maximalist',
    interests: ['DeFi', 'Trading', 'Web3'],
    assets: [{ symbol: 'BTC' }, { symbol: 'ETH' }],
  },
  {
    display_name: 'Luna 2.0',
    username: 'luna_survivor',
    bio: '📉 Lost it all in Luna. Back for revenge. This time I stake smarter. DeFi degen reformed.',
    wallet_rank: 'SHRIMP',
    market_price: 25.50,
    price_change_24h: -12.3,
    balance_love: 500,
    job_title: 'DeFi Researcher',
    interests: ['DeFi', 'NFT', 'Memecoins'],
    assets: [{ symbol: 'ETH' }, { symbol: 'SOL' }],
  },
  {
    display_name: 'NFT Queen 👑',
    username: 'nft_queen_eth',
    bio: '🎨 Collecting rare JPEGs. BAYC #4269 owner. If you can\'t handle my floor price, you don\'t deserve my moon.',
    wallet_rank: 'SHARK',
    market_price: 850.00,
    price_change_24h: 8.7,
    balance_love: 25000,
    job_title: 'NFT Collector',
    interests: ['NFT', 'Travel', 'Gaming'],
    assets: [{ symbol: 'ETH' }, { symbol: 'SOL' }, { symbol: 'TON' }],
  },
  {
    display_name: 'Degen Dave',
    username: 'degen_dave_69',
    bio: '🎰 High risk, high reward. Leverage is my love language. 100x or rekt, no in-between.',
    wallet_rank: 'SHRIMP',
    market_price: 42.00,
    price_change_24h: 69.42,
    balance_love: 1500,
    job_title: 'Leverage Trader',
    interests: ['Trading', 'Memecoins', 'Gym'],
    assets: [{ symbol: 'PEPE' }, { symbol: 'DOGE' }],
  },
  {
    display_name: 'Yield Farmer Kim',
    username: 'yield_farmer_kim',
    bio: '🌾 Farming 300% APY daily. Auto-compounding my way to financial freedom. Show me your TVL.',
    wallet_rank: 'SHARK',
    market_price: 420.69,
    price_change_24h: 5.2,
    balance_love: 15000,
    job_title: 'Yield Strategist',
    interests: ['DeFi', 'Web3', 'Travel'],
    assets: [{ symbol: 'ETH' }, { symbol: 'BNB' }, { symbol: 'TON' }],
  },
  {
    display_name: 'Memecoin Maria',
    username: 'maria_memecoins',
    bio: '🐸 PEPE to the moon! Turned $100 into $100k with memes. Not financial advice, just vibes.',
    wallet_rank: 'SHRIMP',
    market_price: 88.88,
    price_change_24h: 42.0,
    balance_love: 8888,
    job_title: 'Meme Lord',
    interests: ['Memecoins', 'NFT', 'Gaming'],
    assets: [{ symbol: 'PEPE' }, { symbol: 'SHIB' }, { symbol: 'DOGE' }],
  },
  {
    display_name: 'VC Chad',
    username: 'vc_chad_alpha',
    bio: '💼 Partner at Andreessen Crypto. Looking for the next unicorn. Slide into my DMs with your pitch deck.',
    wallet_rank: 'WHALE',
    market_price: 8500.00,
    price_change_24h: 3.2,
    balance_love: 500000,
    job_title: 'Venture Partner',
    interests: ['Web3', 'DeFi', 'Travel'],
    assets: [{ symbol: 'BTC' }, { symbol: 'ETH' }, { symbol: 'SOL' }],
  },
  {
    display_name: 'Solana Sarah',
    username: 'sarah_sol',
    bio: '⚡ Fast, cheap, never down (okay sometimes down). SOL maxi but ETH curious. Show me your TPS.',
    wallet_rank: 'SHARK',
    market_price: 350.00,
    price_change_24h: -2.8,
    balance_love: 12000,
    job_title: 'Solana Developer',
    interests: ['Web3', 'NFT', 'Gym'],
    assets: [{ symbol: 'SOL' }, { symbol: 'ETH' }],
  },
  {
    display_name: 'TON Enthusiast',
    username: 'ton_believer',
    bio: '💎 The Telegram ecosystem is the future. Building on TON. Looking for co-founders and co-signers.',
    wallet_rank: 'SHRIMP',
    market_price: 55.00,
    price_change_24h: 12.5,
    balance_love: 3000,
    job_title: 'TON Builder',
    interests: ['Web3', 'DeFi', 'Gaming'],
    assets: [{ symbol: 'TON' }, { symbol: 'ETH' }],
  },
  {
    display_name: 'Crypto Cutie',
    username: 'crypto_cutie_xx',
    bio: '💕 Looking for someone to HODL through the bear markets. My love language is airdrops.',
    wallet_rank: 'SHRIMP',
    market_price: 75.00,
    price_change_24h: 7.3,
    balance_love: 5000,
    job_title: 'Community Manager',
    interests: ['NFT', 'Travel', 'Gym'],
    assets: [{ symbol: 'ETH' }, { symbol: 'TON' }, { symbol: 'SOL' }],
  },
];

// Ho Chi Minh City area coordinates (randomized within ~5km)
const BASE_LAT = 10.7769;
const BASE_LNG = 106.6958;

function randomCoord(base, variance = 0.05) {
  return base + (Math.random() * variance * 2 - variance);
}

async function seedUsers() {
  console.log('🌱 Starting user seeding...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const user of USERS) {
    try {
      // Check if user already exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${user.display_name} (already exists)`);
        skipped++;
        continue;
      }
      
      // Generate unique telegram_id
      const telegramId = BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 1000000));
      
      // Insert user
      const result = await pool.query(`
        INSERT INTO users (
          telegram_id,
          username,
          display_name,
          bio,
          wallet_rank,
          market_price,
          price_change_24h,
          balance_love,
          latitude,
          longitude,
          job_title,
          interests,
          assets,
          is_active,
          last_active_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, NOW(), NOW(), NOW())
        RETURNING id, display_name, wallet_rank, market_price
      `, [
        telegramId.toString(),
        user.username,
        user.display_name,
        user.bio,
        user.wallet_rank,
        user.market_price,
        user.price_change_24h,
        user.balance_love,
        randomCoord(BASE_LAT),
        randomCoord(BASE_LNG),
        user.job_title,
        JSON.stringify(user.interests),
        JSON.stringify(user.assets),
      ]);
      
      const newUser = result.rows[0];
      console.log(`✅ Created: ${newUser.display_name} (${newUser.wallet_rank}) - $${newUser.market_price}`);
      created++;
      
    } catch (err) {
      console.error(`❌ Failed to create ${user.display_name}:`, err.message);
    }
  }
  
  console.log('\n========================================');
  console.log(`🎉 Seeding complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('========================================\n');
  
  // Show total users in DB
  const countResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
  console.log(`📊 Total active users in database: ${countResult.rows[0].count}\n`);
  
  await pool.end();
}

seedUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
