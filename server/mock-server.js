/**
 * Mock Server for Local Development
 * Simulates backend API when database is not available
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock Users Data
const mockUsers = [
  {
    id: '1',
    telegram_id: '9900000001',
    username: 'sophia_crypto',
    display_name: 'Sophia Chen 🔥',
    bio: 'DeFi degen | Yield farming expert | Always bullish',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophia',
    wallet_rank: 'WHALE',
    market_price: 15000,
    price_change_24h: 12.5,
    distance_km: 2.5,
    is_vip: true,
    source: 'nearby'
  },
  {
    id: '2',
    telegram_id: '9900000002',
    username: 'alex_whale',
    display_name: 'Alex Whale 🐋',
    bio: 'Early Bitcoin adopter | NFT collector',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    wallet_rank: 'WHALE',
    market_price: 12500,
    price_change_24h: -5.2,
    distance_km: 5.1,
    is_vip: true,
    source: 'nearby'
  },
  {
    id: '3',
    telegram_id: '9900000003',
    username: 'maya_nft',
    display_name: 'Maya Tanaka 🦋',
    bio: 'NFT artist | Metaverse explorer',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya',
    wallet_rank: 'SHARK',
    market_price: 4100,
    price_change_24h: 8.3,
    distance_km: 3.2,
    is_vip: true,
    source: 'nearby'
  },
  {
    id: '4',
    telegram_id: '123456789',
    username: 'crypto_lover',
    display_name: 'Crypto Lover 💎',
    bio: 'HODL forever | Diamond hands',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=crypto',
    wallet_rank: 'DOLPHIN',
    market_price: 850,
    price_change_24h: 2.1,
    distance_km: 8.5,
    is_vip: false,
    source: 'global'
  },
  {
    id: '5',
    telegram_id: '987654321',
    username: 'defi_queen',
    display_name: 'DeFi Queen 👑',
    bio: 'Yield farming all day',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=queen',
    wallet_rank: 'SHARK',
    market_price: 2200,
    price_change_24h: -1.5,
    distance_km: 4.7,
    is_vip: false,
    source: 'nearby'
  }
];

// Mock current user
const mockCurrentUser = {
  id: 'current-user-id',
  telegram_id: '7599130386',
  username: 'cuong_van',
  display_name: 'Cuong Van',
  bio: 'Building cool stuff',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cuong',
  wallet_rank: 'SHRIMP',
  market_price: 10,
  balance: 1000,
  latitude: 10.8231,
  longitude: 106.6297
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock server running' });
});

// Auth - verify (mock always succeeds)
app.get('/api/auth/verify', (req, res) => {
  console.log('📤 Auth verify');
  res.json({
    success: true,
    data: {
      user: mockCurrentUser,
      isNewUser: false
    }
  });
});

// Auth - me
app.get('/api/auth/me', (req, res) => {
  console.log('📤 Auth me');
  res.json({
    success: true,
    data: mockCurrentUser
  });
});

// Feed
app.get('/api/feed', (req, res) => {
  console.log('📤 Feed request:', req.query);
  res.json({
    success: true,
    data: {
      users: mockUsers,
      pagination: {
        total: mockUsers.length,
        limit: 20,
        offset: 0,
        hasMore: false
      },
      search: {
        radiusKm: 10,
        coordinates: { lat: 10.8231, lng: 106.6297 }
      },
      meta: {
        source: 'nearby',
        breakdown: {
          nearby: 3,
          global: 1,
          resurrected: 0,
          vip: 3
        }
      }
    }
  });
});

// Feed debug
app.get('/api/feed/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      totalUsers: mockUsers.length,
      vipUsers: mockUsers.filter(u => u.is_vip).length,
      usersWithLocation: mockUsers.length,
      functionExists: true,
      currentUserId: mockCurrentUser.id,
      userSwipes: 0
    }
  });
});

// Swipe - Main endpoint (matches real backend)
app.post('/api/swipe', (req, res) => {
  const { target_id, action, is_mystery } = req.body;
  console.log(`📊 Swipe: ${action} on ${target_id}${is_mystery ? ' (MYSTERY!)' : ''}`);
  
  const isMatch = action === 'LIKE' && Math.random() > 0.7; // 30% chance of match on LIKE
  const baseReward = action === 'LIKE' ? 5 : 1;
  const mysteryBonus = is_mystery ? 100 : 1;
  const matchBonus = isMatch ? 10 : 1;
  const reward = baseReward * mysteryBonus * matchBonus;
  
  res.json({
    success: true,
    data: {
      swipe: {
        id: 'swipe-' + Date.now(),
        actor_id: mockCurrentUser.id,
        target_id: target_id,
        action: action
      },
      match: isMatch ? {
        id: 'match-' + Date.now(),
        user1_id: mockCurrentUser.id,
        user2_id: target_id,
        matched_user: mockUsers.find(u => u.id === target_id) || mockUsers[0]
      } : null,
      reward: {
        amount: reward,
        total: mockCurrentUser.balance + reward,
        bonusType: is_mystery ? 'MYSTERY_CARD' : null,
        bonusMultiplier: mysteryBonus
      }
    }
  });
});

// Swipe - LIKE (legacy endpoint)
app.post('/api/swipe/like/:targetId', (req, res) => {
  console.log('💚 LIKE:', req.params.targetId);
  const isMatch = Math.random() > 0.7; // 30% chance of match
  res.json({
    success: true,
    data: {
      swipe: {
        id: 'swipe-' + Date.now(),
        actor_id: mockCurrentUser.id,
        target_id: req.params.targetId,
        action: 'LIKE'
      },
      match: isMatch ? {
        id: 'match-' + Date.now(),
        user1_id: mockCurrentUser.id,
        user2_id: req.params.targetId
      } : null,
      reward: {
        amount: isMatch ? 50 : 5,
        total: mockCurrentUser.balance + (isMatch ? 50 : 5),
        bonusType: null
      }
    }
  });
});

// Swipe - PASS
app.post('/api/swipe/pass/:targetId', (req, res) => {
  console.log('❌ PASS:', req.params.targetId);
  res.json({
    success: true,
    data: {
      swipe: {
        id: 'swipe-' + Date.now(),
        actor_id: mockCurrentUser.id,
        target_id: req.params.targetId,
        action: 'PASS'
      },
      match: null,
      reward: {
        amount: 1,
        total: mockCurrentUser.balance + 1,
        bonusType: null
      }
    }
  });
});

// Profile
app.get('/api/profile', (req, res) => {
  res.json({
    success: true,
    data: mockCurrentUser
  });
});

// Update profile
app.patch('/api/profile', (req, res) => {
  console.log('📝 Update profile:', req.body);
  Object.assign(mockCurrentUser, req.body);
  res.json({
    success: true,
    data: mockCurrentUser
  });
});

// Matches
app.get('/api/matches', (req, res) => {
  res.json({
    success: true,
    data: {
      matches: [],
      total: 0
    }
  });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: {
      tasks: [
        { id: 1, title: 'Complete Profile', description: 'Add bio and avatar', reward: 100, completed: false },
        { id: 2, title: 'First Swipe', description: 'Make your first swipe', reward: 50, completed: true },
        { id: 3, title: 'Connect Wallet', description: 'Connect TON wallet', reward: 200, completed: false }
      ]
    }
  });
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         🎮 CryptoCrush Mock Server Running                 ║
║                                                            ║
║   API URL: http://localhost:${PORT}/api                       ║
║                                                            ║
║   Available Endpoints:                                     ║
║   • GET  /api/health                                       ║
║   • GET  /api/auth/verify                                  ║
║   • GET  /api/feed                                         ║
║   • POST /api/swipe/like/:id                               ║
║   • POST /api/swipe/pass/:id                               ║
║   • GET  /api/profile                                      ║
║                                                            ║
║   Run frontend: cd client && npm run dev                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});
