#!/bin/bash
# Full debug script for feed issues

echo "============================================"
echo "🔍 CryptoCrush Feed Debug"
echo "============================================"

cd /var/www/SocialFi

echo ""
echo "📥 1. Pulling latest code..."
git pull origin main

echo ""
echo "📦 2. Building frontend..."
cd client
npm run build 2>&1 | tail -5

echo ""
echo "🔄 3. Restarting server..."
pm2 restart cryptocrush-api
sleep 3

echo ""
echo "🔍 4. Testing debug endpoint..."
curl -s "http://localhost:3005/api/feed/debug?telegram_id=7599130386" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:3005/api/feed/debug?telegram_id=7599130386"

echo ""
echo "📋 5. PM2 Logs (last 10 lines)..."
pm2 logs cryptocrush-api --nostream --lines 10

echo ""
echo "✅ Debug complete!"
echo "============================================"
