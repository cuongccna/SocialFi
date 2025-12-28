/**
 * Database Seed Script - CryptoCrush
 * Tạo 50 dân chơi Crypto giả để test
 * 
 * Run: node src/scripts/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Pool } = require('pg');

// ============================================
// Database Connection
// ============================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'CryptoCrush_db',
  user: process.env.DB_USER || 'CryptoCrush_user',
  password: process.env.DB_PASSWORD || 'Cuongnv@123',
});

// ============================================
// Constants
// ============================================

// Center point - TP.HCM (có thể override bằng env)
const CENTER_LAT = parseFloat(process.env.SEED_CENTER_LAT) || 10.8231;
const CENTER_LNG = parseFloat(process.env.SEED_CENTER_LNG) || 106.6297;
const RADIUS_KM = parseFloat(process.env.SEED_RADIUS_KM) || 10;

// ============================================
// 10 Archetypes - Mẫu nhân vật
// ============================================

const ARCHETYPES = [
  {
    displayName: 'Minh Trader',
    username: 'minh_trader',
    bio: 'Full time trader. Lệnh xanh thì đi date, lệnh đỏ thì ở nhà.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Hương ETH',
    username: 'huong_eth_holder',
    bio: 'Holder ETH từ 2017. Tìm người cùng hold đến chết.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Meme Lord',
    username: 'doge_shib_lover',
    bio: 'Chỉ yêu người chơi hệ meme coin (DOGE, SHIB).',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Rug Pull Victim',
    username: 'rug_survivor',
    bio: 'Vừa bị rug pull mất hết. Cần người an ủi.',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'CEO Blockchain',
    username: 'startup_ceo',
    bio: 'CEO của dự án startup blockchain. Tìm Co-founder trọn đời.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Diamond Hands',
    username: 'diamond_hands_vn',
    bio: '💎🙌 Không bao giờ bán. HODL đến khi lên mặt trăng.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'NFT Queen',
    username: 'nft_queen_sg',
    bio: 'Sưu tập NFT và tìm người cùng sở thích digital art.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'DeFi Degen',
    username: 'defi_degen_pro',
    bio: 'Yield farming 24/7. Portfolio xanh thì tâm trạng xanh.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Airdrop Hunter',
    username: 'airdrop_hunter_vn',
    bio: 'Săn airdrop chuyên nghiệp. Đã claim được $50k năm nay.',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
  },
  {
    displayName: 'Solana Maxi',
    username: 'sol_maxi_forever',
    bio: 'SOL to $1000. Không tranh cãi, chỉ tìm người cùng vision.',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face',
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Generate random point within radius from center
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude  
 * @param {number} radiusKm - Radius in kilometers
 * @returns {{ lat: number, lng: number }}
 */
function generateRandomPoint(centerLat, centerLng, radiusKm) {
  // Convert radius from km to degrees (approximate)
  // 1 degree latitude ≈ 111km
  // 1 degree longitude ≈ 111km * cos(latitude)
  const radiusLat = radiusKm / 111;
  const radiusLng = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

  // Random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * 1; // 0 to 1, will scale with radius

  // Calculate offset
  const offsetLat = distance * radiusLat * Math.cos(angle);
  const offsetLng = distance * radiusLng * Math.sin(angle);

  return {
    lat: centerLat + offsetLat,
    lng: centerLng + offsetLng,
  };
}

/**
 * Random number in range
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer in range
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get wallet rank based on probability
 * 5% WHALE, 15% SHARK, 80% SHRIMP
 */
function getRandomWalletRank() {
  const roll = Math.random() * 100;
  if (roll < 5) return 'WHALE';
  if (roll < 20) return 'SHARK';
  return 'SHRIMP';
}

/**
 * Generate random market price ($1 - $500)
 */
function getRandomMarketPrice() {
  return parseFloat(randomInRange(1.0, 500.0).toFixed(2));
}

/**
 * Generate random 24h price change (-20% to +50%)
 */
function getRandomPriceChange() {
  return parseFloat(randomInRange(-20, 50).toFixed(2));
}

/**
 * Generate random LOVE balance based on wallet rank
 */
function getRandomLoveBalance(rank) {
  switch (rank) {
    case 'WHALE':
      return randomInt(5000, 50000);
    case 'SHARK':
      return randomInt(1000, 5000);
    default:
      return randomInt(100, 1000);
  }
}

/**
 * Generate fake Telegram ID
 */
function generateTelegramId() {
  return randomInt(100000000, 999999999);
}

/**
 * Pick random item from array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// Main Seed Function
// ============================================

async function seed() {
  console.log('🌱 Bắt đầu gieo mầm dữ liệu...\n');
  console.log(`📍 Tâm điểm: ${CENTER_LAT}, ${CENTER_LNG}`);
  console.log(`📏 Bán kính: ${RADIUS_KM} km\n`);

  const client = await pool.connect();

  try {
    // Bắt đầu transaction
    await client.query('BEGIN');

    // Xóa sạch dữ liệu cũ
    console.log('🧹 Dọn dẹp dữ liệu cũ...');
    await client.query('TRUNCATE users CASCADE');
    console.log('   ✅ TRUNCATE users CASCADE thành công\n');

    // Tạo 50 users
    console.log('👥 Đang tạo 50 users...\n');

    const stats = { WHALE: 0, SHARK: 0, SHRIMP: 0 };

    for (let i = 1; i <= 50; i++) {
      // Pick random archetype
      const archetype = randomPick(ARCHETYPES);
      
      // Generate unique data
      const telegramId = generateTelegramId();
      const username = `${archetype.username}_${i}`;
      const displayName = `${archetype.displayName} #${i}`;
      
      // Random location
      const location = generateRandomPoint(CENTER_LAT, CENTER_LNG, RADIUS_KM);
      
      // Random wallet data
      const walletRank = getRandomWalletRank();
      const marketPrice = getRandomMarketPrice();
      const priceChange = getRandomPriceChange();
      const balanceLove = getRandomLoveBalance(walletRank);

      stats[walletRank]++;

      // Insert query
      const insertQuery = `
        INSERT INTO users (
          telegram_id,
          username,
          display_name,
          bio,
          avatar_url,
          latitude,
          longitude,
          wallet_rank,
          market_price,
          price_change_24h,
          balance_love,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, display_name, wallet_rank, market_price
      `;

      const values = [
        telegramId,
        username,
        displayName,
        archetype.bio,
        archetype.avatar,
        location.lat,
        location.lng,
        walletRank,
        marketPrice,
        priceChange,
        balanceLove,
        true,
      ];

      const result = await client.query(insertQuery, values);
      const user = result.rows[0];

      // Log với emoji theo rank
      const rankEmoji = walletRank === 'WHALE' ? '🐋' : walletRank === 'SHARK' ? '🦈' : '🦐';
      console.log(`   ${i.toString().padStart(2, '0')}. ${rankEmoji} ${user.display_name} - $${user.market_price}`);
    }

    // Commit transaction
    await client.query('COMMIT');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 THỐNG KÊ:');
    console.log(`   🐋 Whale:  ${stats.WHALE} (${(stats.WHALE / 50 * 100).toFixed(0)}%)`);
    console.log(`   🦈 Shark:  ${stats.SHARK} (${(stats.SHARK / 50 * 100).toFixed(0)}%)`);
    console.log(`   🦐 Shrimp: ${stats.SHRIMP} (${(stats.SHRIMP / 50 * 100).toFixed(0)}%)`);
    console.log('='.repeat(50));
    console.log('\n🎉 Đã gieo mầm thành công 50 dân chơi Crypto!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi seed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ============================================
// Run
// ============================================

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
