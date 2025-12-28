/**
 * VIP Profile Seeder
 * 
 * Creates 20 "Super Profiles" - Premium fake profiles to:
 * 1. Make the app feel more lively
 * 2. Always show attractive profiles to new users
 * 3. These profiles are marked as VIP and always shuffled into feed
 * 
 * Usage: node src/scripts/seed_vip.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

// Database connection - use same config as main app
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'CryptoCrush_db',
  user: process.env.DB_USER || 'CryptoCrush_user',
  password: process.env.DB_PASSWORD || 'Cuongnv@123',
});

// VIP Profiles Data - Beautiful KOL/Model profiles
// Using fake telegram_id starting from 9900000001 (unlikely to conflict with real IDs)
const VIP_PROFILES = [
  // Female VIPs
  {
    telegram_id: 9900000001,
    username: 'crypto_queen_luna',
    display_name: 'Luna Chen 🌙',
    bio: '💎 DeFi Queen | 500+ ETH Staked | Building the future of Web3 | Tokyo 🗼',
    avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 2850.00,
    price_change_24h: 12.5,
    latitude: 10.7769,
    longitude: 106.7009,
  },
  {
    telegram_id: 9900000002,
    username: 'nft_princess_mia',
    display_name: 'Mia Nakamoto ✨',
    bio: '🎨 NFT Artist | Bored Ape Holder | Sold 100+ ETH in art | Love sushi 🍣',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 3200.00,
    price_change_24h: 8.3,
    latitude: 10.7820,
    longitude: 106.6950,
  },
  {
    telegram_id: 9900000003,
    username: 'defi_diva_sarah',
    display_name: 'Sarah Kim 💫',
    bio: '📈 Yield Farmer | $2M TVL | Ex-Goldman | Wine lover 🍷',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 1650.00,
    price_change_24h: -2.1,
    latitude: 10.7900,
    longitude: 106.6800,
  },
  {
    telegram_id: 9900000004,
    username: 'metaverse_maya',
    display_name: 'Maya Tanaka 🦋',
    bio: '🌐 Metaverse Builder | Decentraland OG | Virtual Real Estate Mogul',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 4100.00,
    price_change_24h: 15.7,
    latitude: 10.7650,
    longitude: 106.7100,
  },
  {
    telegram_id: 9900000005,
    username: 'sol_goddess_amy',
    display_name: 'Amy Solana ☀️',
    bio: '⚡ Solana Maxi | 10K SOL Staked | Speed is everything | Yoga 🧘‍♀️',
    avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 1890.00,
    price_change_24h: 22.4,
    latitude: 10.7700,
    longitude: 106.6850,
  },
  {
    telegram_id: 9900000006,
    username: 'trading_queen_lisa',
    display_name: 'Lisa Trading 📊',
    bio: '💰 Professional Trader | 85% Win Rate | Turned $10K → $1M | Coffee addict ☕',
    avatar_url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 5500.00,
    price_change_24h: 18.9,
    latitude: 10.7850,
    longitude: 106.7050,
  },
  {
    telegram_id: 9900000007,
    username: 'dao_queen_emma',
    display_name: 'Emma DAO 🏛️',
    bio: '🗳️ Governance Queen | 5 DAOs Council | Web3 Advocate | Piano 🎹',
    avatar_url: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 1420.00,
    price_change_24h: 5.6,
    latitude: 10.7600,
    longitude: 106.6900,
  },
  {
    telegram_id: 9900000008,
    username: 'btc_baroness_jade',
    display_name: 'Jade Bitcoin 🔶',
    bio: '₿ Bitcoin Maximalist | HODL since 2015 | 21M Club | Hiking 🏔️',
    avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 8900.00,
    price_change_24h: 3.2,
    latitude: 10.7750,
    longitude: 106.7000,
  },
  {
    telegram_id: 9900000009,
    username: 'layer2_lily',
    display_name: 'Lily Layer2 ⚡',
    bio: '🚀 L2 Researcher | Optimism Delegate | Rollup Enthusiast | Cats 🐱',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 1780.00,
    price_change_24h: 11.3,
    latitude: 10.7680,
    longitude: 106.7150,
  },
  {
    telegram_id: 9900000010,
    username: 'ai_crypto_alice',
    display_name: 'Alice AI 🤖',
    bio: '🧠 AI + Crypto Researcher | Building autonomous agents | PhD Stanford',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 3600.00,
    price_change_24h: 28.5,
    latitude: 10.7720,
    longitude: 106.6980,
  },

  // Male VIPs
  {
    telegram_id: 9900000011,
    username: 'whale_hunter_alex',
    display_name: 'Alex Whale 🐋',
    bio: '🔱 Whale Alert OG | $50M+ Portfolio | Early BTC Investor | Yacht Life ⛵',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 12500.00,
    price_change_24h: 7.8,
    latitude: 10.7800,
    longitude: 106.7020,
  },
  {
    telegram_id: 9900000012,
    username: 'defi_chad_mike',
    display_name: 'Mike DeFi 💪',
    bio: '🏋️ DeFi Degen | Aave Protocol Team | Built 3 protocols | Gym bro',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 2100.00,
    price_change_24h: -5.2,
    latitude: 10.7730,
    longitude: 106.6920,
  },
  {
    telegram_id: 9900000013,
    username: 'nft_king_jason',
    display_name: 'Jason NFT King 👑',
    bio: '👑 NFT Flipper | Made $5M on JPEGs | CryptoPunks Collector | Sneakers 👟',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 6800.00,
    price_change_24h: 14.2,
    latitude: 10.7680,
    longitude: 106.7080,
  },
  {
    telegram_id: 9900000014,
    username: 'eth_maxi_david',
    display_name: 'David ETH 💎',
    bio: '💎 Ethereum Believer | Staking 1000+ ETH | Vitalik Stan | Coffee ☕',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 4500.00,
    price_change_24h: 9.1,
    latitude: 10.7760,
    longitude: 106.6870,
  },
  {
    telegram_id: 9900000015,
    username: 'trading_legend_tom',
    display_name: 'Tom Trader 📈',
    bio: '📊 Legendary Trader | $100M Traded Volume | Never Liquidated | Cigars 🚬',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 15000.00,
    price_change_24h: 5.5,
    latitude: 10.7840,
    longitude: 106.7030,
  },
  {
    telegram_id: 9900000016,
    username: 'vc_boss_ryan',
    display_name: 'Ryan VC 🦈',
    bio: '💼 Crypto VC Partner | Invested in 50+ Startups | a]Board Member | Golf ⛳',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 2800.00,
    price_change_24h: 3.8,
    latitude: 10.7620,
    longitude: 106.6950,
  },
  {
    telegram_id: 9900000017,
    username: 'memecoin_master_kevin',
    display_name: 'Kevin Meme 🐸',
    bio: '🐸 Meme Lord | Turned $100 → $10M on PEPE | Degen Life | Lambo 🏎️',
    avatar_url: 'https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 7200.00,
    price_change_24h: 45.6,
    latitude: 10.7700,
    longitude: 106.7100,
  },
  {
    telegram_id: 9900000018,
    username: 'gamefi_pro_lucas',
    display_name: 'Lucas GameFi 🎮',
    bio: '🎮 GameFi Whale | Top 10 Axie Player | Owns Virtual Land Empire | Esports',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 1950.00,
    price_change_24h: 18.3,
    latitude: 10.7780,
    longitude: 106.6890,
  },
  {
    telegram_id: 9900000019,
    username: 'zk_wizard_chris',
    display_name: 'Chris ZK 🧙‍♂️',
    bio: '🔐 ZK-Proof Expert | Privacy Maxi | Building zkApps | Math PhD 🎓',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'SHARK',
    market_price: 2350.00,
    price_change_24h: 8.7,
    latitude: 10.7650,
    longitude: 106.7040,
  },
  {
    telegram_id: 9900000020,
    username: 'crosschain_king_max',
    display_name: 'Max Bridge 🌉',
    bio: '🌉 Cross-Chain OG | Bridged $500M+ | Multi-Chain Maxi | Surfing 🏄',
    avatar_url: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop&crop=face',
    wallet_rank: 'WHALE',
    market_price: 5800.00,
    price_change_24h: 12.1,
    latitude: 10.7710,
    longitude: 106.6960,
  },
];

async function seedVIPProfiles() {
  const client = await pool.connect();
  
  try {
    console.log('🌟 Starting VIP Profile Seeder...\n');
    
    await client.query('BEGIN');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const profile of VIP_PROFILES) {
      // Check if VIP profile already exists
      const existingResult = await client.query(
        'SELECT id FROM users WHERE telegram_id = $1',
        [profile.telegram_id]
      );

      const now = new Date();

      if (existingResult.rows.length > 0) {
        // Update existing VIP profile
        await client.query(`
          UPDATE users SET
            username = $1,
            display_name = $2,
            bio = $3,
            avatar_url = $4,
            wallet_rank = $5,
            market_price = $6,
            price_change_24h = $7,
            latitude = $8,
            longitude = $9,
            last_active_at = $10,
            is_vip = true,
            updated_at = $10
          WHERE telegram_id = $11
        `, [
          profile.username,
          profile.display_name,
          profile.bio,
          profile.avatar_url,
          profile.wallet_rank,
          profile.market_price,
          profile.price_change_24h,
          profile.latitude,
          profile.longitude,
          now,
          profile.telegram_id,
        ]);
        updatedCount++;
        console.log(`  ♻️  Updated: ${profile.display_name}`);
      } else {
        // Insert new VIP profile
        await client.query(`
          INSERT INTO users (
            telegram_id, username, display_name, bio, avatar_url,
            wallet_rank, market_price, price_change_24h,
            latitude, longitude, last_active_at, is_vip,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $11, $11)
        `, [
          profile.telegram_id,
          profile.username,
          profile.display_name,
          profile.bio,
          profile.avatar_url,
          profile.wallet_rank,
          profile.market_price,
          profile.price_change_24h,
          profile.latitude,
          profile.longitude,
          now,
        ]);
        insertedCount++;
        console.log(`  ✅ Inserted: ${profile.display_name}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 VIP Seeding Complete!');
    console.log(`   ✅ Inserted: ${insertedCount} new profiles`);
    console.log(`   ♻️  Updated: ${updatedCount} existing profiles`);
    console.log(`   📊 Total VIP Profiles: ${VIP_PROFILES.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeder
seedVIPProfiles()
  .then(() => {
    console.log('\n✨ Done! VIP profiles are ready to crush hearts! 💔\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
