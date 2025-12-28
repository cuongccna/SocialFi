#!/bin/bash
# Debug script - Run on VPS to check database status

echo "🔍 CryptoCrush Database Debug"
echo "=============================="

export PGPASSWORD="Cuongnv@123"
DB_USER="CryptoCrush_user"
DB_NAME="CryptoCrush_db"

echo ""
echo "1. Check total users:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "2. Check active users:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as active_users FROM users WHERE is_active = TRUE;"

echo ""
echo "3. Check VIP column exists:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_vip';"

echo ""
echo "4. Check VIP users:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as vip_users FROM users WHERE is_vip = TRUE;" 2>/dev/null || echo "is_vip column may not exist"

echo ""
echo "5. Check users with location:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as users_with_location FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL;"

echo ""
echo "6. Check calculate_distance_km function:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT calculate_distance_km(10.0, 106.0, 10.1, 106.1) as test_distance;" 2>/dev/null || echo "❌ Function does not exist!"

echo ""
echo "7. Sample users (last 5):"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT id, telegram_id, display_name, wallet_rank, market_price, latitude, longitude, is_active FROM users ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "8. Check swipes table:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as total_swipes FROM swipes;"

echo ""
echo "9. Check migrations applied:"
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT * FROM _migrations ORDER BY applied_at DESC LIMIT 10;" 2>/dev/null || echo "No migrations table found"

echo ""
echo "=============================="
echo "Debug complete!"
