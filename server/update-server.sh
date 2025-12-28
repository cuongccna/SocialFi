#!/bin/bash
# Quick update script for VPS

echo "📥 Pulling latest code..."
cd /var/www/SocialFi
git pull origin main

echo "📦 Installing any new dependencies..."
cd /var/www/SocialFi/server
npm install

echo "🔄 Restarting PM2..."
pm2 restart cryptocrush-api

echo "⏳ Waiting for server to start..."
sleep 3

echo "🔍 Testing debug endpoint..."
curl -s http://localhost:3005/api/feed/debug | head -c 1000

echo ""
echo "✅ Update complete!"
