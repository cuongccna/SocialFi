/**
 * CryptoCrush - SocialFi Dating Backend
 * Entry point
 */

// Load environment variables FIRST (from server/.env)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

// Config & Database
const config = require('./config');
const { checkDbConnection } = require('./config/db');

// Telegram Bot
const { initBot } = require('./services/telegramBot');

// Workers
const { initMarketMaker } = require('./workers/marketMaker');

// Socket handlers
const { initChatSocket } = require('./socket/chat');
const { setupKYPSocketHandlers } = require('./controllers/kypController');
const { setupMiningSocketHandlers } = require('./controllers/miningController');
const { setupCandleKissSocketHandlers } = require('./controllers/candleKissController');

// Middlewares
const { notFound, errorHandler } = require('./middlewares');

// Routes
const apiRoutes = require('./routes');

// Initialize Express app
const app = express();

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to our router
app.set('io', io);

// ============================================
// Middleware Stack
// ============================================

// Security headers - allow cross-origin resource loading for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - serve from project root /public folder
// This handles /public/certificates/, /public/avatars/, etc.
const publicPath = path.join(__dirname, '../../public');
console.log('📂 Static files path:', publicPath);
app.use('/public', express.static(publicPath, {
  maxAge: '1y',
  etag: true,
}));
console.log('📂 Static files being served at /public');

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Routes
// ============================================

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CryptoCrush API',
    description: 'SocialFi Dating Telegram Mini App',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ============================================
// Error Handling
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

async function startServer() {
  console.log('\n🚀 Starting CryptoCrush Server...\n');
  
  // Test database connection
  const dbConnected = await checkDbConnection();
  
  if (!dbConnected) {
    console.error('\n⚠️  Server starting without database connection.');
    console.error('   Some features may not work.\n');
  }
  
  // Initialize Telegram Bot (if token provided)
  if (config.botToken) {
    await initBot(config.botToken);
  } else {
    console.warn('⚠️  BOT_TOKEN not set. Bot relay features disabled.');
  }
  
  // Initialize Market Maker (Automated Trading Bots)
  initMarketMaker();
  
  // Initialize Socket.io chat handlers
  initChatSocket(io);
  
  // Initialize KYP game socket handlers
  setupKYPSocketHandlers(io);
  
  // Initialize Mining game socket handlers
  setupMiningSocketHandlers(io);
  
  // Initialize Candle Kiss game socket handlers
  setupCandleKissSocketHandlers(io);
  
  // Start HTTP server (for both Express + Socket.io)
  server.listen(config.port, () => {
    console.log(`\n✨ Server is running!`);
    console.log(`   🌐 URL: http://localhost:${config.port}`);
    console.log(`   🔌 WebSocket: ws://localhost:${config.port}`);
    console.log(`   📦 Environment: ${config.nodeEnv}`);
    console.log(`   🔗 Health: http://localhost:${config.port}/api/health\n`);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();
