# CryptoCrush SocialFi - Dating Telegram Mini App

<p align="center">
  <img src="docs/assets/logo.png" alt="CryptoCrush Logo" width="200">
</p>

<p align="center">
  <strong>A SocialFi Dating Telegram Mini App with Prediction Markets</strong>
</p>

<p align="center">
  <a href="#features">Features</a> â€¢
  <a href="#tech-stack">Tech Stack</a> â€¢
  <a href="#quick-start">Quick Start</a> â€¢
  <a href="#deployment">Deployment</a> â€¢
  <a href="#api-documentation">API Docs</a>
</p>

---

## ðŸš€ Features

### Core Dating Features
- **Tinder-style Swipe Feed** - Swipe right to like, left to pass, up to superlike
- **Mutual Match System** - Get matched when both users like each other
- **Real-time Chat** - Message your matches directly in the app
- **Love Contracts** - Mint NFT contracts when relationships become official

### SocialFi & GameFi
- **$LOVE Token Economy** - Earn tokens through engagement
- **User Market Cap** - Each user has a dynamic market price
- **Prediction Markets** - Bet LONG or SHORT on couples' relationships
- **Leaderboard** - Compete for top earner, most active, most popular

### Additional Features
- **Daily Tasks** - Complete missions to earn rewards
- **Referral System** - Invite friends and earn bonuses
- **TON Wallet Integration** - Connect wallet for rewards
- **Jury DAO** - Vote on relationship disputes

---

## ðŸ›  Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Grammy.js** for Telegram Bot

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + custom dark theme
- **Framer Motion** for animations
- **@twa-dev/sdk** for Telegram WebApp
- **@tonconnect/ui-react** for wallet

### Infrastructure
- **Nginx** as reverse proxy
- **PM2** for process management
- **Let's Encrypt** for SSL
- **CloudFlare Tunnel** (optional)

---

## ðŸƒ Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL 14+
- Telegram Bot Token (from @BotFather)

### 1. Clone Repository
```bash
git clone https://github.com/cuongccna/SocialFi.git
cd SocialFi
```

### 2. Setup Database
```bash
# Create database
sudo -u postgres createdb CryptoCrush_db
sudo -u postgres createuser CryptoCrush_user

# Run migrations
cd database/migrations
for file in *.sql; do
  psql -U CryptoCrush_user -d CryptoCrush_db -f "$file"
done
```

### 3. Configure Environment
```bash
cd server
cp .env.example .env
# Edit .env with your credentials
```

### 4. Install Dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 5. Run Development
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev

# Terminal 3: Cloudflare Tunnel (for Telegram testing)
cloudflared tunnel --url http://localhost:5173
```

---

## ðŸ“¦ Deployment

### Automated Deployment
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### Server Requirements
- VPS with 2GB+ RAM
- Ubuntu 22.04 LTS
- Domain with DNS configured

---

## ðŸ“š API Documentation

### Authentication
All API requests require Telegram initData in Authorization header.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user |
| GET | /api/auth/me | Get current user |
| GET | /api/feed | Get swipe feed |
| POST | /api/actions/swipe | Perform swipe action |
| GET | /api/matches | Get user's matches |
| GET | /api/messages/:matchId | Get chat messages |
| POST | /api/messages | Send message |
| GET | /api/markets | Get prediction markets |
| POST | /api/markets/:id/bet | Place bet |
| GET | /api/leaderboard | Get rankings |
| GET | /api/tasks | Get available tasks |
| POST | /api/tasks/:id/claim | Claim task reward |
| GET | /api/referrals | Get referral info |
| GET | /api/disputes | Get open disputes |
| POST | /api/disputes/:id/vote | Vote on dispute |
| POST | /api/wallet/connect | Connect wallet |

---

## ðŸ“ Project Structure

```
SocialFi/
â”œâ”€â”€ client/                 # React frontend
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ api/           # API client
â”‚   â”‚   â”œâ”€â”€ components/    # UI components
â”‚   â”‚   â”œâ”€â”€ context/       # React contexts
â”‚   â”‚   â”œâ”€â”€ pages/         # Page components
â”‚   â”‚   â”œâ”€â”€ services/      # API services
â”‚   â”‚   â””â”€â”€ utils/         # Utilities
â”‚   â””â”€â”€ public/            # Static assets
â”œâ”€â”€ server/                 # Express backend
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ config/        # Configuration
â”‚       â”œâ”€â”€ controllers/   # Route handlers
â”‚       â”œâ”€â”€ middlewares/   # Express middlewares
â”‚       â”œâ”€â”€ routes/        # API routes
â”‚       â””â”€â”€ services/      # Business logic
â”œâ”€â”€ database/
â”‚   â””â”€â”€ migrations/        # SQL migrations
â”œâ”€â”€ docs/                   # Documentation
â”‚   â”œâ”€â”€ DEPLOYMENT.md      # Deployment guide
â”‚   â””â”€â”€ TEST_CASES.md      # Test cases
â”œâ”€â”€ nginx/                  # Nginx configs
â”œâ”€â”€ deploy.sh              # Deployment script
â””â”€â”€ ecosystem.config.js    # PM2 config
```

---

## ðŸ§ª Testing

See [docs/TEST_CASES.md](docs/TEST_CASES.md) for comprehensive test cases.

```bash
# Run backend tests (when implemented)
cd server && npm test

# Run frontend tests (when implemented)
cd client && npm test
```

---

## ðŸ” Security

- Telegram initData verification with HMAC-SHA256
- Rate limiting on all endpoints
- SQL injection prevention with parameterized queries
- CORS protection
- Helmet.js security headers

---

## ðŸ“„ License

MIT License - See [LICENSE](LICENSE) for details.

---

## ðŸ‘¥ Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing`
5. Open Pull Request

---

## ðŸ“ž Support

- Telegram: [@CryptoCrushBot](https://t.me/CryptoCrushBot)
- Email: support@magiamhot.io.vn

---

Made with â¤ï¸ for the Telegram Mini Apps ecosystem
