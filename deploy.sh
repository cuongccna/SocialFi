#!/bin/bash

# =============================================================================
# CryptoCrush SocialFi - Deployment Script
# VPS: 72.61.114.103
# Domain: magiamhot.io.vn
# =============================================================================

set -e

# Configuration
VPS_IP="72.61.114.103"
VPS_USER="root"
APP_DIR="/var/www/SocialFi"
REPO_URL="https://github.com/cuongccna/SocialFi.git"
DOMAIN="magiamhot.io.vn"
NODE_ENV="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# STEP 1: Connect and prepare server
# =============================================================================
prepare_server() {
    log_info "Preparing server..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        # Update system
        apt update && apt upgrade -y
        
        # Install required packages if not exists
        command -v node >/dev/null 2>&1 || {
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        }
        
        command -v pm2 >/dev/null 2>&1 || npm install -g pm2
        command -v nginx >/dev/null 2>&1 || apt install -y nginx
        command -v certbot >/dev/null 2>&1 || apt install -y certbot python3-certbot-nginx
        
        # Create app directory
        mkdir -p /var/www
        
        echo "Server preparation complete"
ENDSSH
    
    log_info "Server prepared successfully"
}

# =============================================================================
# STEP 2: Deploy application
# =============================================================================
deploy_app() {
    log_info "Deploying application..."
    
    ssh ${VPS_USER}@${VPS_IP} << ENDSSH
        cd /var/www
        
        # Clone or pull repository
        if [ -d "SocialFi" ]; then
            echo "Updating existing repository..."
            cd SocialFi
            git fetch origin
            git reset --hard origin/main
        else
            echo "Cloning repository..."
            git clone ${REPO_URL}
            cd SocialFi
        fi
        
        # Install backend dependencies
        echo ""
        echo "=== Installing backend dependencies ==="
        cd server
        npm install --production
        
        # Verify critical packages are installed
        echo ""
        echo "Checking critical packages..."
        REQUIRED_PACKAGES="express pg cors helmet dotenv grammy node-cron @faker-js/faker"
        for pkg in \$REQUIRED_PACKAGES; do
            if [ -d "node_modules/\$pkg" ] || [ -d "node_modules/@faker-js" ]; then
                echo "  ✓ \$pkg installed"
            else
                echo "  ⚠ Installing missing package: \$pkg"
                npm install \$pkg --save
            fi
        done
        
        # Install frontend dependencies and build
        echo ""
        echo "=== Installing frontend dependencies ==="
        cd ../client
        npm install
        
        echo ""
        echo "=== Building frontend ==="
        npm run build
        
        echo ""
        echo "Application deployed successfully"
ENDSSH
    
    log_info "Application deployed successfully"
}
    log_info "Application deployed successfully"
}

# =============================================================================
# STEP 3: Configure environment variables
# =============================================================================
configure_env() {
    log_info "Configuring environment variables..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        cd /var/www/SocialFi/server
        
        # Create .env file if not exists (will need manual configuration)
        if [ ! -f ".env" ]; then
            cat > .env << 'EOF'
# =============================================================================
# CryptoCrush SocialFi - Production Environment
# =============================================================================

# Server Configuration
PORT=3000
NODE_ENV=production

# Development Auth Bypass (set to false in production!)
DEV_BYPASS_AUTH=false

# PostgreSQL Database
DATABASE_URL=postgresql://CryptoCrush_user:YOUR_DB_PASSWORD@localhost:5432/CryptoCrush_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CryptoCrush_db
DB_USER=CryptoCrush_user
DB_PASSWORD=YOUR_DB_PASSWORD

# Also keep PG vars for compatibility
PGHOST=localhost
PGPORT=5432
PGDATABASE=CryptoCrush_db
PGUSER=CryptoCrush_user
PGPASSWORD=YOUR_DB_PASSWORD

# Telegram Bot
BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN

# CORS
CORS_ORIGIN=https://magiamhot.io.vn

# TonConnect
TONCONNECT_MANIFEST_URL=https://magiamhot.io.vn/tonconnect-manifest.json

# =============================================================================
# IMPORTANT: Update the following values after deployment:
# 1. DB_PASSWORD / PGPASSWORD - Your actual database password
# 2. BOT_TOKEN / TELEGRAM_BOT_TOKEN - Your Telegram bot token from @BotFather
# =============================================================================
EOF
            echo "Created .env file - PLEASE UPDATE WITH ACTUAL VALUES!"
        else
            echo ".env file already exists - checking for missing variables..."
            
            # Add missing variables
            grep -q "DEV_BYPASS_AUTH" .env || echo "DEV_BYPASS_AUTH=false" >> .env
            grep -q "DB_HOST" .env || echo "DB_HOST=localhost" >> .env
            grep -q "DB_PORT" .env || echo "DB_PORT=5432" >> .env
            grep -q "DB_NAME" .env || echo "DB_NAME=CryptoCrush_db" >> .env
            grep -q "DB_USER" .env || echo "DB_USER=CryptoCrush_user" >> .env
            grep -q "DB_PASSWORD" .env || echo "DB_PASSWORD=YOUR_DB_PASSWORD" >> .env
            grep -q "BOT_TOKEN" .env || echo "BOT_TOKEN=YOUR_BOT_TOKEN" >> .env
            
            echo ".env file updated with any missing variables"
        fi
ENDSSH
    
    log_warn "Remember to update .env with actual database password and bot token!"
}

# =============================================================================
# STEP 4: Configure Nginx
# =============================================================================
configure_nginx() {
    log_info "Configuring Nginx..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        # Create nginx configuration
        cat > /etc/nginx/sites-available/cryptocrush << 'EOF'
# CryptoCrush SocialFi - Nginx Configuration
server {
    listen 80;
    listen [::]:80;
    server_name magiamhot.io.vn www.magiamhot.io.vn;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name magiamhot.io.vn www.magiamhot.io.vn;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/magiamhot.io.vn/privkey.pem;
    
    # SSL settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Security headers for Telegram Mini App
    add_header X-Frame-Options "ALLOWALL" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
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
EOF

        # Enable site
        ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/
        
        # Remove default site if exists
        rm -f /etc/nginx/sites-enabled/default
        
        # Test nginx configuration
        nginx -t
        
        echo "Nginx configured successfully"
ENDSSH
    
    log_info "Nginx configured successfully"
}

# =============================================================================
# STEP 5: Setup SSL with Let's Encrypt
# =============================================================================
setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    ssh ${VPS_USER}@${VPS_IP} << ENDSSH
        # First, create a temporary nginx config without SSL for initial cert request
        cat > /etc/nginx/sites-available/cryptocrush-temp << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name magiamhot.io.vn www.magiamhot.io.vn;
    
    root /var/www/SocialFi/client/dist;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
        
        # Create webroot directory
        mkdir -p /var/www/html
        
        # Use temp config
        ln -sf /etc/nginx/sites-available/cryptocrush-temp /etc/nginx/sites-enabled/cryptocrush
        systemctl reload nginx
        
        # Get SSL certificate
        certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || {
            echo "Certbot failed - may need manual intervention"
            exit 1
        }
        
        # Restore full nginx config
        ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/cryptocrush
        rm -f /etc/nginx/sites-available/cryptocrush-temp
        
        # Reload nginx
        systemctl reload nginx
        
        # Setup auto-renewal
        systemctl enable certbot.timer
        
        echo "SSL setup complete"
ENDSSH
    
    log_info "SSL certificate configured successfully"
}

# =============================================================================
# STEP 6: Configure PM2
# =============================================================================
configure_pm2() {
    log_info "Configuring PM2..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        cd /var/www/SocialFi
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js << 'EOF'
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
EOF
        
        # Create logs directory
        mkdir -p /var/www/SocialFi/logs
        
        # Stop existing instance if running
        pm2 delete cryptocrush-api 2>/dev/null || true
        
        # Start with PM2
        pm2 start ecosystem.config.js
        
        # Save PM2 configuration
        pm2 save
        
        # Setup PM2 startup (if not already)
        pm2 startup systemd -u root --hp /root 2>/dev/null || true
        
        echo "PM2 configured successfully"
ENDSSH
    
    log_info "PM2 configured successfully"
}

# =============================================================================
# STEP 7: Setup Database (if needed)
# =============================================================================
setup_database() {
    log_info "Setting up database..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        # Check if PostgreSQL is installed
        command -v psql >/dev/null 2>&1 || {
            apt install -y postgresql postgresql-contrib
            systemctl enable postgresql
            systemctl start postgresql
        }
        
        # Create database and user (if not exists)
        sudo -u postgres psql << 'SQLEOF'
-- Create user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'CryptoCrush_user') THEN
        CREATE ROLE CryptoCrush_user WITH LOGIN PASSWORD 'YOUR_SECURE_PASSWORD';
    END IF;
END
$$;

-- Create database if not exists
SELECT 'CREATE DATABASE CryptoCrush_db OWNER CryptoCrush_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'CryptoCrush_db')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE CryptoCrush_db TO CryptoCrush_user;
SQLEOF
        
        echo "Database setup complete - remember to update password!"
ENDSSH
    
    log_warn "Remember to update database password in both PostgreSQL and .env file!"
}

# =============================================================================
# STEP 8: Run migrations
# =============================================================================
run_migrations() {
    log_info "Running database migrations..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        echo "=== Running Database Migrations ==="
        
        # Set database credentials from .env
        source /var/www/SocialFi/server/.env 2>/dev/null || true
        
        # Use DB_ variables or fall back to PG_ variables
        DB_HOST="${DB_HOST:-${PGHOST:-localhost}}"
        DB_USER="${DB_USER:-${PGUSER:-CryptoCrush_user}}"
        DB_NAME="${DB_NAME:-${PGDATABASE:-CryptoCrush_db}}"
        DB_PASS="${DB_PASSWORD:-${PGPASSWORD:-}}"
        
        export PGPASSWORD="$DB_PASS"
        
        echo "Connecting to: $DB_HOST / $DB_NAME as $DB_USER"
        
        # ------------------------------------------
        # Run migrations from database/migrations/
        # ------------------------------------------
        cd /var/www/SocialFi/database/migrations
        
        echo ""
        echo "--- Running database/migrations/ ---"
        
        # Migration files in order
        MIGRATIONS=(
            "001_initial_schema_no_postgis.sql"
            "002_add_messages.sql"
            "003_add_disputes.sql"
            "004_add_blurred_images.sql"
            "005_add_tasks_referrals.sql"
            "006_add_bot_support.sql"
            "007_add_price_history.sql"
            "008_add_yield_farming.sql"
            "009_add_profile_boost.sql"
            "010_add_fud_mechanism.sql"
        )
        
        for file in "${MIGRATIONS[@]}"; do
            if [ -f "$file" ]; then
                echo "  ✓ Running: $file"
                psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1 | grep -v "NOTICE" || true
            else
                echo "  ⚠ Skipped (not found): $file"
            fi
        done
        
        # ------------------------------------------
        # Run migrations from server/migrations/
        # ------------------------------------------
        cd /var/www/SocialFi/server/migrations
        
        echo ""
        echo "--- Running server/migrations/ ---"
        
        SERVER_MIGRATIONS=(
            "011_add_is_vip_column.sql"
        )
        
        for file in "${SERVER_MIGRATIONS[@]}"; do
            if [ -f "$file" ]; then
                echo "  ✓ Running: $file"
                psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1 | grep -v "NOTICE" || true
            else
                echo "  ⚠ Skipped (not found): $file"
            fi
        done
        
        echo ""
        echo "=== Migrations complete ==="
ENDSSH
    
    log_info "Migrations completed"
}

# =============================================================================
# STEP 9: Final restart and verification
# =============================================================================
final_restart() {
    log_info "Performing final restart..."
    
    ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
        # Restart Nginx
        systemctl restart nginx
        
        # Restart PM2 app
        pm2 restart cryptocrush-api
        
        # Show status
        echo ""
        echo "=== PM2 Status ==="
        pm2 status
        
        echo ""
        echo "=== Nginx Status ==="
        systemctl status nginx --no-pager -l
        
        echo ""
        echo "=== Service URLs ==="
        echo "Frontend: https://magiamhot.io.vn"
        echo "API: https://magiamhot.io.vn/api"
        
        echo ""
        echo "Deployment complete!"
ENDSSH
    
    log_info "Deployment finished successfully!"
}

# =============================================================================
# Main Menu
# =============================================================================
show_menu() {
    echo ""
    echo "=================================================="
    echo "  CryptoCrush SocialFi Deployment Script"
    echo "  VPS: ${VPS_IP}"
    echo "  Domain: ${DOMAIN}"
    echo "=================================================="
    echo ""
    echo "1) Full deployment (all steps)"
    echo "2) Prepare server only"
    echo "3) Deploy application only"
    echo "4) Configure environment"
    echo "5) Configure Nginx"
    echo "6) Setup SSL"
    echo "7) Configure PM2"
    echo "8) Setup Database"
    echo "9) Run migrations"
    echo "10) Final restart"
    echo "11) Quick deploy (git pull + restart)"
    echo "12) Show migrations & packages info"
    echo "0) Exit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1) 
            prepare_server
            deploy_app
            configure_env
            setup_database
            run_migrations
            configure_nginx
            setup_ssl
            configure_pm2
            final_restart
            ;;
        2) prepare_server ;;
        3) deploy_app ;;
        4) configure_env ;;
        5) configure_nginx ;;
        6) setup_ssl ;;
        7) configure_pm2 ;;
        8) setup_database ;;
        9) run_migrations ;;
        10) final_restart ;;
        11)
            log_info "Quick deploy - pulling latest and restarting..."
            ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
                cd /var/www/SocialFi
                git pull origin main
                cd server && npm install --production
                cd ../client && npm install && npm run build
                pm2 restart cryptocrush-api
                echo "Quick deploy complete!"
ENDSSH
            ;;
        12)
            echo ""
            echo "=================================================="
            echo "  Database Migrations"
            echo "=================================================="
            echo ""
            echo "database/migrations/:"
            echo "  001_initial_schema_no_postgis.sql - Core tables (users, swipes, relationships)"
            echo "  002_add_messages.sql              - Chat/messaging system"
            echo "  003_add_disputes.sql              - Dispute resolution system"
            echo "  004_add_blurred_images.sql        - Blurred image unlock feature"
            echo "  005_add_tasks_referrals.sql       - Tasks & referral system"
            echo "  006_add_bot_support.sql           - Bot users & distance calculation"
            echo "  007_add_price_history.sql         - Price history for charts"
            echo "  008_add_yield_farming.sql         - Yield farming for couples"
            echo "  009_add_profile_boost.sql         - Profile boost feature"
            echo "  010_add_fud_mechanism.sql         - FUD mechanism"
            echo ""
            echo "server/migrations/:"
            echo "  011_add_is_vip_column.sql         - VIP user support"
            echo ""
            echo "=================================================="
            echo "  Server Packages (npm)"
            echo "=================================================="
            echo ""
            echo "Production Dependencies:"
            echo "  @faker-js/faker  - Generate fake data for bots"
            echo "  cors             - Cross-origin resource sharing"
            echo "  dotenv           - Environment variables"
            echo "  express          - Web framework"
            echo "  grammy           - Telegram Bot API"
            echo "  helmet           - Security headers"
            echo "  node-cron        - Scheduled tasks (Market Maker)"
            echo "  pg               - PostgreSQL client"
            echo ""
            echo "Dev Dependencies:"
            echo "  nodemon          - Auto-restart on file changes"
            echo ""
            ;;
        0) exit 0 ;;
        *) log_error "Invalid option" ;;
    esac
}

# Run menu
show_menu
