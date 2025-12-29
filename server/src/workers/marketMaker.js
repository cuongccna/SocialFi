/**
 * Market Maker Worker
 * Automated Market Maker system using node-cron
 * 
 * Task A: User Spawner - Creates dummy "Crypto Bro" users every hour
 * Task B: Volume Generator - Bots swipe on users every 15 minutes
 */

const cron = require('node-cron');
const { pool, query } = require('../config/db');
const config = require('../config');

// Faker will be loaded dynamically (ESM module)
let faker = null;

// Initialize faker dynamically
async function initFaker() {
  if (!faker) {
    const fakerModule = await import('@faker-js/faker');
    faker = fakerModule.faker;
  }
  return faker;
}

// Ho Chi Minh City center coordinates
const HCMC_CENTER = {
  lat: 10.8231,
  lng: 106.6297,
};

// Crypto Bro persona templates
const CRYPTO_PERSONAS = [
  { prefix: 'Diamond', suffix: 'Hands', bio: '💎🙌 HODL till the moon! Never selling.' },
  { prefix: 'NFT', suffix: 'Collector', bio: '🖼️ Collecting rare JPEGs since 2021' },
  { prefix: 'DeFi', suffix: 'Degen', bio: '🔥 Yield farming addict. 1000% APY or nothing' },
  { prefix: 'Rug', suffix: 'Survivor', bio: '🏴‍☠️ Lost it all, still here. WAGMI' },
  { prefix: 'Moon', suffix: 'Boy', bio: '🚀 Next stop: Lambo dealership' },
  { prefix: 'Whale', suffix: 'Watcher', bio: '🐋 Following the smart money' },
  { prefix: 'Gas', suffix: 'Fee Hater', bio: '⛽ Waiting for low gas to swap' },
  { prefix: 'Alpha', suffix: 'Hunter', bio: '🎯 10x or die trying' },
  { prefix: 'Ser', suffix: 'Degen', bio: '🙏 GM ser, LFG!' },
  { prefix: 'Based', suffix: 'Chad', bio: '💪 Built different. Few understand.' },
  { prefix: 'Airdrop', suffix: 'Farmer', bio: '🪂 Farming every testnet since 2020' },
  { prefix: 'Meme', suffix: 'Lord', bio: '🐸 PEPE Army General' },
  { prefix: 'Leverage', suffix: 'King', bio: '📊 100x longs only. YOLO' },
  { prefix: 'Paper', suffix: 'Hands', bio: '📄 I panic sold at the bottom (again)' },
  { prefix: 'Pump', suffix: 'Chaser', bio: '📈 FOMO is my trading strategy' },
];

/**
 * Generate random coordinates within radius of a center point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {{ lat: number, lng: number }}
 */
function generateRandomLocation(centerLat, centerLng, radiusKm) {
  // Convert radius from km to degrees (approximate)
  const radiusDegrees = radiusKm / 111.32; // 1 degree ≈ 111.32 km
  
  // Generate random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDegrees;
  
  // Calculate offset
  const latOffset = distance * Math.cos(angle);
  const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
  
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

/**
 * Generate a random wallet rank based on distribution
 * 5% Whale, 15% Shark, 80% Shrimp
 * @returns {'WHALE' | 'SHARK' | 'SHRIMP'}
 */
function generateWalletRank() {
  const roll = Math.random() * 100;
  if (roll < 5) return 'WHALE';
  if (roll < 20) return 'SHARK';
  return 'SHRIMP';
}

/**
 * Generate a unique bot telegram ID
 * Uses negative IDs to distinguish from real users
 * @returns {number}
 */
function generateBotTelegramId() {
  // Negative IDs starting from -1000000000 for bots
  return -1000000000 - Math.floor(Math.random() * 999999999);
}

/**
 * Task A: User Spawner
 * Creates 5 new dummy "Crypto Bro" users
 * Runs every hour
 */
async function spawnDummyUsers() {
  console.log('\n🤖 [Market Maker] Task A: Spawning dummy users...');
  
  // Initialize faker (ESM module)
  const faker = await initFaker();
  
  const usersToCreate = 5;
  let createdCount = 0;
  
  for (let i = 0; i < usersToCreate; i++) {
    try {
      // Pick random persona
      const persona = CRYPTO_PERSONAS[Math.floor(Math.random() * CRYPTO_PERSONAS.length)];
      
      // Generate unique username
      const uniqueNum = faker.number.int({ min: 1000, max: 9999 });
      const username = `${persona.prefix}${persona.suffix}${uniqueNum}`.toLowerCase().replace(/\s/g, '');
      const displayName = `${persona.prefix} ${persona.suffix} ${faker.person.lastName()}`;
      
      // Generate location within 10km of HCMC
      const location = generateRandomLocation(HCMC_CENTER.lat, HCMC_CENTER.lng, 10);
      
      // Generate wallet rank
      const walletRank = generateWalletRank();
      
      // Generate initial market price based on rank
      let marketPrice = 10.0;
      if (walletRank === 'WHALE') {
        marketPrice = faker.number.float({ min: 50, max: 200, fractionDigits: 2 });
      } else if (walletRank === 'SHARK') {
        marketPrice = faker.number.float({ min: 20, max: 50, fractionDigits: 2 });
      } else {
        marketPrice = faker.number.float({ min: 5, max: 20, fractionDigits: 2 });
      }
      
      // Generate fake wallet address
      const walletAddress = faker.string.hexadecimal({ length: 40, prefix: '0x' });
      
      // Generate bot telegram ID
      const telegramId = generateBotTelegramId();
      
      // Generate avatar URL
      const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
      
      // Bio with emoji
      const bio = `${persona.bio} | ${faker.hacker.phrase()}`;
      
      // Insert into database
      await query(`
        INSERT INTO users (
          telegram_id,
          username,
          display_name,
          bio,
          avatar_url,
          latitude,
          longitude,
          wallet_address,
          wallet_rank,
          market_price,
          price_change_24h,
          balance_love,
          is_active,
          is_bot,
          last_active_at,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE, NOW(), NOW(), NOW()
        )
        ON CONFLICT (telegram_id) DO NOTHING;
      `, [
        telegramId,
        username,
        displayName,
        bio,
        avatarUrl,
        location.lat,
        location.lng,
        walletAddress,
        walletRank,
        marketPrice,
        0,
        faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
      ]);
      
      createdCount++;
      console.log(`   ✅ Created bot: ${displayName} (${walletRank}) @ $${marketPrice.toFixed(2)}`);
      
    } catch (error) {
      console.error(`   ❌ Failed to create bot user:`, error.message);
    }
  }
  
  console.log(`🤖 [Market Maker] Task A complete: ${createdCount}/${usersToCreate} users created\n`);
}

/**
 * Update target user's market price based on swipe action
 * Also records price history for charts
 * @param {string} targetId - Target user ID
 * @param {'LIKE' | 'PASS' | 'SUPER'} action - Swipe action
 */
async function updateMarketPrice(targetId, action) {
  let priceChange = 0;
  
  if (action === 'LIKE') {
    priceChange = config.constants.PRICE_CHANGE_LIKE;
  } else if (action === 'SUPER') {
    priceChange = config.constants.PRICE_CHANGE_LIKE * 2;
  } else if (action === 'PASS') {
    priceChange = config.constants.PRICE_CHANGE_PASS;
  }
  
  const result = await query(`
    UPDATE users 
    SET 
      market_price = GREATEST(market_price + (market_price * $1 / 100), 0.01),
      price_change_24h = price_change_24h + $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING market_price;
  `, [priceChange, targetId]);
  
  // Record price history for charts
  if (result.rows.length > 0) {
    const newPrice = result.rows[0].market_price;
    await query(`
      INSERT INTO price_history (user_id, price)
      VALUES ($1, $2);
    `, [targetId, newPrice]);
  }
  
  return priceChange;
}

/**
 * Check for and create match if mutual like exists
 * @param {string} actorId - Actor user ID
 * @param {string} targetId - Target user ID
 * @param {'LIKE' | 'PASS' | 'SUPER'} action - Swipe action
 */
async function checkAndCreateMatch(actorId, targetId, action) {
  if (action !== 'LIKE' && action !== 'SUPER') return null;
  
  // Check if target has liked the actor
  const mutualLike = await query(`
    SELECT id FROM swipes 
    WHERE actor_id = $1 
      AND target_id = $2 
      AND action IN ('LIKE', 'SUPER')
  `, [targetId, actorId]);
  
  if (mutualLike.rows.length > 0) {
    // Create relationship
    const relationshipResult = await query(`
      INSERT INTO relationships (user_a, user_b, status, start_date)
      VALUES ($1, $2, 'MATCHED', NOW())
      ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) 
      DO UPDATE SET updated_at = NOW()
      RETURNING id;
    `, [actorId, targetId]);
    
    // MATCH PUMP: Both users get +5% market price
    const matchResult = await query(`
      UPDATE users 
      SET 
        market_price = market_price + (market_price * $1 / 100),
        price_change_24h = price_change_24h + $1,
        updated_at = NOW()
      WHERE id IN ($2, $3)
      RETURNING id, market_price;
    `, [config.constants.PRICE_CHANGE_MATCH, actorId, targetId]);
    
    // Record match pump price history for both users
    for (const user of matchResult.rows) {
      await query(`
        INSERT INTO price_history (user_id, price)
        VALUES ($1, $2);
      `, [user.id, user.market_price]);
    }
    
    return relationshipResult.rows[0]?.id;
  }
  
  return null;
}

/**
 * Task B: Volume Generator
 * Bots swipe on random users
 * Runs every 15 minutes
 */
async function generateVolume() {
  console.log('\n📊 [Market Maker] Task B: Generating swipe volume...');
  
  try {
    // Get random bots (users with is_bot = TRUE or negative telegram_id)
    const botsResult = await query(`
      SELECT id, display_name 
      FROM users 
      WHERE (is_bot = TRUE OR telegram_id < 0)
        AND is_active = TRUE
      ORDER BY RANDOM()
      LIMIT 10;
    `);
    
    if (botsResult.rows.length === 0) {
      console.log('   ⚠️  No bots available. Run Task A first.');
      return;
    }
    
    const bots = botsResult.rows;
    let swipeCount = 0;
    let matchCount = 0;
    
    for (const bot of bots) {
      // Get random target users (real users or other bots, excluding self and already swiped)
      const targetsResult = await query(`
        SELECT id, display_name, market_price
        FROM users
        WHERE id != $1
          AND is_active = TRUE
          AND id NOT IN (
            SELECT target_id FROM swipes WHERE actor_id = $1
          )
        ORDER BY RANDOM()
        LIMIT 3;
      `, [bot.id]);
      
      for (const target of targetsResult.rows) {
        // 70% LIKE, 30% PASS (no SUPER from bots)
        const action = Math.random() < 0.7 ? 'LIKE' : 'PASS';
        
        try {
          // Insert swipe
          await query(`
            INSERT INTO swipes (actor_id, target_id, action)
            VALUES ($1, $2, $3)
            ON CONFLICT (actor_id, target_id) DO NOTHING;
          `, [bot.id, target.id, action]);
          
          // Update market price
          const priceChange = await updateMarketPrice(target.id, action);
          
          // Check for match
          const matchId = await checkAndCreateMatch(bot.id, target.id, action);
          if (matchId) {
            matchCount++;
            console.log(`   💘 MATCH: ${bot.display_name} ↔ ${target.display_name}`);
          }
          
          swipeCount++;
          const arrow = action === 'LIKE' ? '💚' : '❌';
          const change = priceChange >= 0 ? `+${priceChange.toFixed(1)}%` : `${priceChange.toFixed(1)}%`;
          console.log(`   ${arrow} ${bot.display_name} → ${target.display_name} (${change})`);
          
        } catch (error) {
          // Likely duplicate swipe, ignore
          if (!error.message.includes('duplicate key')) {
            console.error(`   ❌ Swipe failed:`, error.message);
          }
        }
      }
    }
    
    console.log(`📊 [Market Maker] Task B complete: ${swipeCount} swipes, ${matchCount} matches\n`);
    
  } catch (error) {
    console.error('❌ [Market Maker] Task B failed:', error.message);
  }
}

/**
 * Reset 24h price changes daily at midnight
 */
async function resetDailyPriceChanges() {
  console.log('\n🔄 [Market Maker] Resetting 24h price changes...');
  
  try {
    const result = await query(`
      UPDATE users 
      SET price_change_24h = 0, updated_at = NOW()
      WHERE is_active = TRUE;
    `);
    
    console.log(`🔄 [Market Maker] Reset complete: ${result.rowCount} users updated\n`);
  } catch (error) {
    console.error('❌ [Market Maker] Reset failed:', error.message);
  }
}

// Yield Farming Constants
const LOVE_PER_HOUR = 10; // $LOVE accrued per hour per relationship

/**
 * Task C: Yield Farming Accrual
 * Passively accrue $LOVE for all active couples every hour
 */
async function accrueYieldFarming() {
  console.log('\n🌾 [Yield Farming] Accruing passive $LOVE for couples...');
  
  try {
    // Update accrued_love for all active relationships
    // Add LOVE_PER_HOUR to accrued_love for each eligible relationship
    const result = await query(`
      UPDATE relationships
      SET 
        accrued_love = accrued_love + $1,
        updated_at = NOW()
      WHERE status IN ('MATCHED', 'MINTED_CONTRACT')
      RETURNING id;
    `, [LOVE_PER_HOUR]);
    
    const count = result.rowCount || 0;
    const totalAccrued = count * LOVE_PER_HOUR;
    
    console.log(`🌾 [Yield Farming] Accrued ${totalAccrued} $LOVE across ${count} relationships\n`);
    
  } catch (error) {
    console.error('❌ [Yield Farming] Accrual failed:', error.message);
  }
}

/**
 * Initialize all cron jobs
 */
function initMarketMaker() {
  console.log('\n🏭 [Market Maker] Initializing Automated Market Maker...');
  
  // Task A: User Spawner - Every hour at minute 0
  // Cron: '0 * * * *' = At minute 0 of every hour
  cron.schedule('0 * * * *', () => {
    spawnDummyUsers();
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh',
  });
  console.log('   ✅ Task A (User Spawner): Scheduled every hour');
  
  // Task B: Volume Generator - Every 15 minutes
  // Cron: '*/15 * * * *' = Every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    generateVolume();
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh',
  });
  console.log('   ✅ Task B (Volume Generator): Scheduled every 15 minutes');
  
  // Task C: Yield Farming Accrual - Every hour at minute 30
  // Cron: '30 * * * *' = At minute 30 of every hour
  cron.schedule('30 * * * *', () => {
    accrueYieldFarming();
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh',
  });
  console.log('   ✅ Task C (Yield Farming): Scheduled every hour at :30');
  
  // Bonus: Reset 24h price changes at midnight
  // Cron: '0 0 * * *' = At 00:00 every day
  cron.schedule('0 0 * * *', () => {
    resetDailyPriceChanges();
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh',
  });
  console.log('   ✅ Bonus Task (Daily Reset): Scheduled at midnight');
  
  console.log('🏭 [Market Maker] All cron jobs initialized!\n');
  
  // Run initial spawn and volume generation on startup (optional, for testing)
  if (process.env.MARKET_MAKER_RUN_ON_START === 'true') {
    console.log('🏭 [Market Maker] Running initial tasks...');
    spawnDummyUsers().then(() => generateVolume());
  }
}

module.exports = {
  initMarketMaker,
  spawnDummyUsers,
  generateVolume,
  resetDailyPriceChanges,
  accrueYieldFarming,
};
