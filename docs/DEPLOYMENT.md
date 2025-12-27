# CryptoCrush SocialFi - Deployment Guide

## Overview
This guide covers the complete deployment of CryptoCrush SocialFi Dating Telegram Mini App to a VPS server.

**Target Server:** 72.61.114.103  
**Domain:** dilink.click  
**Repository:** https://github.com/cuongccna/SocialFi.git

---

## Prerequisites

### On Local Machine
- SSH key configured for VPS access
- Git installed
- Access to repository

### On VPS Server
- Ubuntu 22.04 LTS (or similar)
- Root access
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- PM2 already running for other services

---

## Quick Deployment

### Option 1: Using deploy.sh Script
```bash
# From local machine
chmod +x deploy.sh
./deploy.sh

# Select option 1 for full deployment
# Or option 11 for quick update (git pull + restart)
```

### Option 2: Manual Step-by-Step

---

## Step 1: SSH to Server
```bash
ssh root@72.61.114.103
```

## Step 2: Clone Repository
```bash
cd /var/www
git clone https://github.com/cuongccna/SocialFi.git
cd SocialFi
```

## Step 3: Install Dependencies

### Backend
```bash
cd server
npm install --production
```

### Frontend
```bash
cd ../client
npm install
npm run build
```

## Step 4: Configure Environment Variables

### Create server/.env
```bash
cd /var/www/SocialFi/server
nano .env
```

Add the following (update with real values):
```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://CryptoCrush_user:YOUR_PASSWORD@localhost:5432/CryptoCrush_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=CryptoCrush_db
PGUSER=CryptoCrush_user
PGPASSWORD=YOUR_PASSWORD

# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN

# CORS
CORS_ORIGIN=https://dilink.click

# TonConnect
TONCONNECT_MANIFEST_URL=https://dilink.click/tonconnect-manifest.json
```

## Step 5: Setup PostgreSQL Database

### Install PostgreSQL (if not installed)
```bash
apt update
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### Create Database and User
```bash
sudo -u postgres psql
```

```sql
CREATE USER CryptoCrush_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
CREATE DATABASE CryptoCrush_db OWNER CryptoCrush_user;
GRANT ALL PRIVILEGES ON DATABASE CryptoCrush_db TO CryptoCrush_user;
\c CryptoCrush_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### Run Migrations
```bash
cd /var/www/SocialFi/database/migrations
for file in *.sql; do
  PGPASSWORD=YOUR_PASSWORD psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -f "$file"
done
```

## Step 6: Configure PM2

### Create Ecosystem File
```bash
cd /var/www/SocialFi
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'cryptocrush-api',
      cwd: '/var/www/SocialFi/server',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/www/SocialFi/logs/api-error.log',
      out_file: '/var/www/SocialFi/logs/api-out.log',
      log_file: '/var/www/SocialFi/logs/api-combined.log',
      time: true
    }
  ]
};
```

### Create Logs Directory
```bash
mkdir -p /var/www/SocialFi/logs
```

### Start Application
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Verify Running
```bash
pm2 status
pm2 logs cryptocrush-api
```

## Step 7: Configure Nginx

### Install Nginx (if not installed)
```bash
apt install -y nginx
```

### Create Site Configuration
```bash
nano /etc/nginx/sites-available/cryptocrush
```

```nginx
# CryptoCrush SocialFi - Nginx Configuration
server {
    listen 80;
    listen [::]:80;
    server_name dilink.click www.dilink.click;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dilink.click www.dilink.click;

    # SSL certificates (configured by certbot)
    ssl_certificate /etc/letsencrypt/live/dilink.click/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dilink.click/privkey.pem;
    
    # SSL settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Security headers for Telegram Mini App
    # IMPORTANT: Do NOT use X-Frame-Options: DENY for Telegram Mini Apps!
    add_header X-Frame-Options "ALLOWALL" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend - Static files
    root /var/www/SocialFi/client/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
    
    # API Proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # TonConnect manifest
    location /tonconnect-manifest.json {
        alias /var/www/SocialFi/client/dist/tonconnect-manifest.json;
        add_header Access-Control-Allow-Origin *;
    }
    
    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site
```bash
ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## Step 8: Setup SSL with Let's Encrypt

### Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate
```bash
certbot --nginx -d dilink.click -d www.dilink.click
```

### Auto-Renewal
```bash
systemctl enable certbot.timer
```

## Step 9: Configure Telegram Bot

### Update Bot WebApp URL in BotFather
1. Open @BotFather in Telegram
2. Send `/mybots` → Select your bot
3. Bot Settings → Menu Button → Edit
4. Set URL: `https://dilink.click`

### Configure Web App
1. Bot Settings → Web App
2. Set Web App URL: `https://dilink.click`

---

## Maintenance Commands

### View Logs
```bash
pm2 logs cryptocrush-api
pm2 logs cryptocrush-api --lines 100
```

### Restart Application
```bash
pm2 restart cryptocrush-api
```

### Update Application
```bash
cd /var/www/SocialFi
git pull origin main
cd server && npm install --production
cd ../client && npm install && npm run build
pm2 restart cryptocrush-api
```

### Check Status
```bash
pm2 status
pm2 monit
```

### Database Backup
```bash
pg_dump -U CryptoCrush_user -d CryptoCrush_db > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### App Not Loading
1. Check PM2: `pm2 status`
2. Check logs: `pm2 logs cryptocrush-api`
3. Check Nginx: `systemctl status nginx`
4. Check SSL: `curl -I https://dilink.click`

### Database Connection Issues
1. Check PostgreSQL: `systemctl status postgresql`
2. Test connection: `psql -U CryptoCrush_user -d CryptoCrush_db`
3. Check .env file for correct credentials

### Telegram WebApp Not Opening
1. Verify HTTPS is working
2. Check X-Frame-Options header (must be ALLOWALL)
3. Verify bot WebApp URL in BotFather

### PM2 Not Starting on Reboot
```bash
pm2 startup systemd -u root --hp /root
pm2 save
```

---

## Security Checklist

- [ ] Change default database password
- [ ] Secure .env file: `chmod 600 .env`
- [ ] Enable firewall: `ufw enable`
- [ ] Allow only necessary ports: 22, 80, 443
- [ ] Regular security updates: `apt update && apt upgrade`
- [ ] Monitor logs for suspicious activity

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Telegram      │
                    │   Bot/WebApp    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  CloudFlare     │
                    │  (optional CDN) │
                    └────────┬────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────┐
│                VPS: 72.61.114.103                  │
│  ┌──────────────────────────────────────────────┐  │
│  │              Nginx (Port 443/80)             │  │
│  │  - SSL Termination                           │  │
│  │  - Static file serving                       │  │
│  │  - Reverse proxy to Node.js                  │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                   │
│       ┌─────────┴─────────┐                        │
│       ▼                   ▼                        │
│  ┌─────────────┐   ┌─────────────────────┐        │
│  │   Static    │   │   PM2 → Node.js     │        │
│  │   Files     │   │   (Port 3000)       │        │
│  │  /dist/*    │   │   API Backend       │        │
│  └─────────────┘   └──────────┬──────────┘        │
│                               │                    │
│                               ▼                    │
│                    ┌─────────────────────┐        │
│                    │    PostgreSQL       │        │
│                    │    (Port 5432)      │        │
│                    └─────────────────────┘        │
└────────────────────────────────────────────────────┘
```

---

## Contact

For issues with deployment, check:
1. [docs/TEST_CASES.md](TEST_CASES.md) - Feature test cases
2. Server logs: `/var/www/SocialFi/logs/`
3. PM2 logs: `pm2 logs`
