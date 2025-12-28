#!/bin/bash
# Quick setup script - Run migrations and seed VIP profiles
# Usage: bash setup-db.sh

echo "🚀 CryptoCrush Database Quick Setup"
echo "===================================="

export PGPASSWORD="Cuongnv@123"
DB_USER="CryptoCrush_user"
DB_NAME="CryptoCrush_db"
APP_DIR="/var/www/SocialFi"

cd $APP_DIR

echo ""
echo "📦 Step 1: Running initial schema migration..."
psql -h localhost -U $DB_USER -d $DB_NAME -f database/migrations/001_initial_schema_no_postgis.sql 2>&1 | grep -v "already exists" | head -20

echo ""
echo "📦 Step 2: Running additional migrations..."
for file in database/migrations/002*.sql database/migrations/003*.sql database/migrations/004*.sql database/migrations/005*.sql; do
    if [ -f "$file" ]; then
        echo "  → Applying: $file"
        psql -h localhost -U $DB_USER -d $DB_NAME -f "$file" 2>&1 | grep -v "already exists" | head -5
    fi
done

echo ""
echo "📦 Step 3: Adding is_vip column..."
psql -h localhost -U $DB_USER -d $DB_NAME -f server/src/migrations/010_add_is_vip_column.sql 2>&1 | grep -v "already exists"

echo ""
echo "📦 Step 4: Verifying calculate_distance_km function..."
RESULT=$(psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT calculate_distance_km(10.0, 106.0, 10.1, 106.1)::text;" 2>/dev/null)
if [ -n "$RESULT" ]; then
    echo "  ✅ Function works! Test distance: $RESULT km"
else
    echo "  ❌ Function not found, recreating..."
    psql -h localhost -U $DB_USER -d $DB_NAME -c "
    CREATE OR REPLACE FUNCTION calculate_distance_km(
        lat1 DOUBLE PRECISION,
        lon1 DOUBLE PRECISION,
        lat2 DOUBLE PRECISION,
        lon2 DOUBLE PRECISION
    ) RETURNS DOUBLE PRECISION AS \$\$
    DECLARE
        R CONSTANT DOUBLE PRECISION := 6371;
        dlat DOUBLE PRECISION;
        dlon DOUBLE PRECISION;
        a DOUBLE PRECISION;
        c DOUBLE PRECISION;
    BEGIN
        dlat := RADIANS(lat2 - lat1);
        dlon := RADIANS(lon2 - lon1);
        a := SIN(dlat / 2) * SIN(dlat / 2) +
             COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
             SIN(dlon / 2) * SIN(dlon / 2);
        c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
        RETURN R * c;
    END;
    \$\$ LANGUAGE plpgsql IMMUTABLE;
    "
    echo "  ✅ Function created!"
fi

echo ""
echo "📦 Step 5: Seeding VIP profiles..."
cd server
npm run seed:vip 2>&1 | tail -20

echo ""
echo "📦 Step 6: Verifying database state..."
cd $APP_DIR
echo ""
echo "  Total users:"
psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;"

echo "  VIP users:"
psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users WHERE is_vip = TRUE;"

echo "  Users with location:"
psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users WHERE latitude IS NOT NULL;"

echo ""
echo "===================================="
echo "✅ Database setup complete!"
echo ""
echo "Now restart the backend:"
echo "  pm2 restart cryptocrush-api"
