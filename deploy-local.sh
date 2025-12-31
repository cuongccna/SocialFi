#!/bin/bash

# =====================================================
# CryptoCrush SocialFi - Local VPS Deployment Script
# Run this script DIRECTLY on VPS (not via SSH)
# IDEMPOTENT: Safe to run multiple times
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/SocialFi"
DOMAIN="magiamhot.io.vn"
BACKUP_DIR="/var/backups/cryptocrush"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =====================================================
# 1. Install System Dependencies (only if missing)
# =====================================================
install_dependencies() {
    log_info "Checking system dependencies..."
    
    NEED_UPDATE=false
    
    # Check each package
    if ! command -v nginx &> /dev/null; then
        log_info "Nginx not found, will install..."
        NEED_UPDATE=true
    fi
    
    if ! command -v psql &> /dev/null; then
        log_info "PostgreSQL not found, will install..."
        NEED_UPDATE=true
    fi
    
    if ! command -v certbot &> /dev/null; then
        log_info "Certbot not found, will install..."
        NEED_UPDATE=true
    fi
    
    if [ "$NEED_UPDATE" = true ]; then
        apt-get update
        apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
    else
        log_info "Basic packages already installed"
    fi
    
    # Install canvas dependencies (required for certificate/NFT image generation)
    log_info "Checking canvas build dependencies..."
    if ! dpkg -s libcairo2-dev &> /dev/null; then
        log_info "Installing canvas build dependencies..."
        apt-get update
        apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
    else
        log_info "Canvas dependencies already installed"
    fi
    
    # Install Node.js 20.x if not installed or wrong version
    if ! command -v node &> /dev/null; then
        log_info "Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_info "Upgrading Node.js to 20.x..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        else
            log_info "Node.js $(node -v) already installed"
        fi
    fi
    
    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        npm install -g pm2
    else
        log_info "PM2 already installed"
    fi
    
    log_success "Dependencies ready!"
}

# =====================================================
# 2. Setup PostgreSQL Database (create if not exists)
# =====================================================
setup_database() {
    log_info "Checking PostgreSQL database..."
    
    # Start PostgreSQL if not running
    systemctl start postgresql 2>/dev/null || true
    systemctl enable postgresql 2>/dev/null || true
    
    # Check if user exists
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='CryptoCrush_user'" 2>/dev/null || echo "0")
    if [ "$USER_EXISTS" != "1" ]; then
        log_info "Creating database user..."
        sudo -u postgres psql -c "CREATE USER CryptoCrush_user WITH PASSWORD 'Cuongnv@123';" 2>/dev/null || log_warning "User may already exist"
    else
        log_info "Database user already exists"
    fi
    
    # Check if database exists
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='CryptoCrush_db'" 2>/dev/null || echo "0")
    if [ "$DB_EXISTS" != "1" ]; then
        log_info "Creating database..."
        sudo -u postgres psql -c "CREATE DATABASE CryptoCrush_db OWNER CryptoCrush_user;" 2>/dev/null || log_warning "Database may already exist"
    else
        log_info "Database already exists"
    fi
    
    # Ensure permissions (safe to run multiple times)
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE CryptoCrush_db TO CryptoCrush_user;" 2>/dev/null || true
    
    log_success "Database ready!"
}

# =====================================================
# 3. Run Database Migrations (idempotent)
# =====================================================
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$APP_DIR/database/migrations"
    
    export PGPASSWORD="Cuongnv@123"
    
    # Create migrations tracking table if not exists
    psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -c "
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    " 2>/dev/null || true
    
    for file in *.sql; do
        if [ -f "$file" ]; then
            # Check if migration already applied
            APPLIED=$(psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -tAc "SELECT 1 FROM _migrations WHERE filename='$file'" 2>/dev/null || echo "0")
            
            if [ "$APPLIED" != "1" ]; then
                log_info "Applying migration: $file"
                # Run migration, ignore errors (tables may already exist)
                psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -f "$file" 2>&1 | grep -v "already exists" || true
                # Record migration
                psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -c "INSERT INTO _migrations (filename) VALUES ('$file') ON CONFLICT DO NOTHING;" 2>/dev/null || true
                log_success "Migration $file applied"
            else
                log_info "Skipping already applied: $file"
            fi
        fi
    done
    
    # Also run server migrations if they exist
    if [ -d "$APP_DIR/server/src/migrations" ]; then
        log_info "Running server migrations..."
        cd "$APP_DIR/server/src/migrations"
        
        for file in *.sql; do
            if [ -f "$file" ]; then
                APPLIED=$(psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -tAc "SELECT 1 FROM _migrations WHERE filename='server_$file'" 2>/dev/null || echo "0")
                
                if [ "$APPLIED" != "1" ]; then
                    log_info "Applying server migration: $file"
                    psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -f "$file" 2>&1 | grep -v "already exists" || true
                    psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -c "INSERT INTO _migrations (filename) VALUES ('server_$file') ON CONFLICT DO NOTHING;" 2>/dev/null || true
                    log_success "Server migration $file applied"
                else
                    log_info "Skipping already applied server migration: $file"
                fi
            fi
        done
    fi
    
    log_success "Migrations complete!"
}

# =====================================================
# 3.5. Seed VIP Profiles
# =====================================================
seed_vip_profiles() {
    log_info "Seeding VIP profiles..."
    
    cd "$APP_DIR/server"
    
    # Check if VIP seed already done
    export PGPASSWORD="Cuongnv@123"
    VIP_COUNT=$(psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -tAc "SELECT COUNT(*) FROM users WHERE is_vip = TRUE" 2>/dev/null || echo "0")
    
    if [ "$VIP_COUNT" -gt "0" ]; then
        log_info "VIP profiles already exist ($VIP_COUNT profiles), updating..."
    fi
    
    # Run VIP seeder
    npm run seed:vip 2>&1 || {
        log_warning "VIP seeding had issues, but continuing..."
    }
    
    log_success "VIP profiles ready!"
}

# =====================================================
# 3.6. Create Prediction Markets for Existing Contracts
# =====================================================
create_prediction_markets() {
    log_info "Creating prediction markets for existing minted contracts..."
    
    cd "$APP_DIR/server"
    
    # Check if script exists
    if [ -f "scripts/create-markets.js" ]; then
        node scripts/create-markets.js 2>&1 || {
            log_warning "Market creation had issues, but continuing..."
        }
        log_success "Prediction markets ready!"
    else
        log_warning "create-markets.js script not found, skipping..."
    fi
}

# =====================================================
# 3.7. Regenerate Missing NFT Certificates
# =====================================================
regenerate_certificates() {
    log_info "Regenerating missing NFT certificates..."
    
    cd "$APP_DIR/server"
    
    # Check if script exists
    if [ -f "scripts/regenerate-certificates.js" ]; then
        node scripts/regenerate-certificates.js 2>&1 || {
            log_warning "Certificate regeneration had issues, but continuing..."
        }
        log_success "NFT certificates ready!"
    else
        log_warning "regenerate-certificates.js script not found, skipping..."
    fi
}

# =====================================================
# 4. Configure Environment (backup existing, create if not exists)
# =====================================================
configure_env() {
    log_info "Configuring environment..."
    
    ENV_FILE="$APP_DIR/server/.env"
    
    # If .env exists, backup it
    if [ -f "$ENV_FILE" ]; then
        BACKUP_NAME="env_$(date +%Y%m%d_%H%M%S).backup"
        cp "$ENV_FILE" "$BACKUP_DIR/$BACKUP_NAME"
        log_info "Existing .env backed up to $BACKUP_DIR/$BACKUP_NAME"
        
        # Check if it's already production config
        if grep -q "NODE_ENV=production" "$ENV_FILE"; then
            log_info ".env already configured for production"
            
            # Just ensure CORS is correct
            if ! grep -q "CORS_ORIGIN=https://magiamhot.io.vn" "$ENV_FILE"; then
                sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://magiamhot.io.vn|' "$ENV_FILE"
                log_info "Updated CORS_ORIGIN"
            fi
            
            log_success "Environment ready!"
            return
        fi
    fi
    
    # Create production .env with all required variables
    cat > "$ENV_FILE" << 'EOF'
# ========================================
# CryptoCrush Production Environment
# ========================================

# Server Configuration
PORT=3005
NODE_ENV=production

# Development Auth Bypass (MUST be false in production!)
DEV_BYPASS_AUTH=false

# ========================================
# PostgreSQL Database
# ========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CryptoCrush_db
DB_USER=CryptoCrush_user
DB_PASSWORD=Cuongnv@123

# Also keep PG vars for compatibility
PGHOST=localhost
PGPORT=5432
PGDATABASE=CryptoCrush_db
PGUSER=CryptoCrush_user
PGPASSWORD=Cuongnv@123

# ========================================
# Telegram Bot
# ========================================
BOT_TOKEN=8450445506:AAHTteZ8NBswolK9N91y7d-cet9q5flIloE
TELEGRAM_BOT_TOKEN=8450445506:AAHTteZ8NBswolK9N91y7d-cet9q5flIloE

# ========================================
# CORS & URLs
# ========================================
CORS_ORIGIN=https://magiamhot.io.vn

# TON Connect Manifest
TONCONNECT_MANIFEST_URL=https://magiamhot.io.vn/tonconnect-manifest.json
EOF

    log_success "Environment configured with all required variables!"
}

# =====================================================
# 5. Build Application
# =====================================================
build_app() {
    log_info "Building application..."
    
    # Install backend dependencies
    cd "$APP_DIR/server"
    log_info "Installing backend dependencies..."
    npm install --production
    
    # ========================================
    # Verify critical npm packages are installed
    # ========================================
    log_info "Verifying critical packages..."
    
    CRITICAL_PACKAGES=(
        "@faker-js/faker"    # Market maker bot users (ESM module)
        "canvas"             # Certificate/NFT image generation
        "cors"               # CORS handling
        "dotenv"             # Environment variables
        "express"            # Web framework
        "grammy"             # Telegram bot
        "helmet"             # Security headers
        "multer"             # File upload handling
        "node-cron"          # Scheduled tasks (market maker)
        "pg"                 # PostgreSQL client
        "socket.io"          # Real-time WebSocket (Server-side)
    )
    
    for pkg in "${CRITICAL_PACKAGES[@]}"; do
        if ! npm list "$pkg" --depth=0 2>/dev/null | grep -q "$pkg"; then
            log_warning "Package $pkg not found, installing..."
            npm install "$pkg" --save
        else
            log_info "Package $pkg is installed"
        fi
    done
    
    # Install frontend dependencies and build
    cd "$APP_DIR/client"
    log_info "Installing frontend dependencies..."
    npm install
    
    # Verify critical frontend packages
    log_info "Verifying critical frontend packages..."
    CRITICAL_CLIENT_PACKAGES=(
        "socket.io-client"   # Real-time WebSocket (Client-side)
        "framer-motion"      # Animations
        "canvas-confetti"    # Celebration effects for minting NFT
    )
    
    for pkg in "${CRITICAL_CLIENT_PACKAGES[@]}"; do
        if ! npm list "$pkg" --depth=0 2>/dev/null | grep -q "$pkg"; then
            log_warning "Frontend package $pkg not found, installing..."
            npm install "$pkg" --save
        else
            log_info "Frontend package $pkg is installed"
        fi
    done
    
    log_info "Building frontend..."
    npm run build
    
    # Create target directory if not exists
    mkdir -p /var/www/html/cryptocrush
    
    # Sync build (preserves existing files, updates changed ones)
    rsync -av --delete dist/ /var/www/html/cryptocrush/ 2>/dev/null || cp -r dist/* /var/www/html/cryptocrush/
    
    # Create certificates directory for NFT images
    log_info "Creating certificates directory..."
    mkdir -p "$APP_DIR/public/certificates"
    chmod 755 "$APP_DIR/public/certificates"
    
    # Create avatars directory for user profile photos
    log_info "Creating avatars directory..."
    mkdir -p "$APP_DIR/public/avatars"
    chmod 755 "$APP_DIR/public/avatars"
    
    log_success "Application built with all dependencies!"
}

# =====================================================
# 6. Configure Nginx (backup existing)
# =====================================================
configure_nginx() {
    log_info "Configuring Nginx..."
    
    NGINX_CONF="/etc/nginx/sites-available/cryptocrush"
    
    # Backup existing config if different
    if [ -f "$NGINX_CONF" ]; then
        BACKUP_NAME="nginx_$(date +%Y%m%d_%H%M%S).backup"
        cp "$NGINX_CONF" "$BACKUP_DIR/$BACKUP_NAME"
        log_info "Existing Nginx config backed up"
    fi
    
    # Check if SSL cert exists to decide which config to use
    if [ -f "/etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem" ]; then
        log_info "SSL certificate found, using HTTPS config..."
        
        cat > "$NGINX_CONF" << 'EOF'
# CryptoCrush SocialFi - Nginx Configuration (HTTPS)

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=60r/s;

upstream cryptocrush_api {
    server 127.0.0.1:3005;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name magiamhot.io.vn www.magiamhot.io.vn;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name magiamhot.io.vn www.magiamhot.io.vn;
    
    ssl_certificate /etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/magiamhot.io.vn/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    add_header X-Frame-Options "ALLOWALL" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    root /var/www/html/cryptocrush;
    index index.html;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Socket.io WebSocket for real-time chat
    location /socket.io/ {
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # Public static files (backend)
    location /public/ {
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /tonconnect-manifest.json {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location / {
        limit_req zone=general_limit burst=100 nodelay;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    else
        log_info "No SSL certificate, using HTTP config..."
        
        cat > "$NGINX_CONF" << 'EOF'
# CryptoCrush SocialFi - Nginx Configuration (HTTP only)

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=60r/s;

upstream cryptocrush_api {
    server 127.0.0.1:3005;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name magiamhot.io.vn www.magiamhot.io.vn;
    
    add_header X-Frame-Options "ALLOWALL" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    root /var/www/html/cryptocrush;
    index index.html;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Socket.io WebSocket for real-time chat
    location /socket.io/ {
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # Public static files (backend)
    location /public/ {
        proxy_pass http://cryptocrush_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /tonconnect-manifest.json {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location / {
        limit_req zone=general_limit burst=100 nodelay;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    fi

    # Enable site (safe - ln -sf overwrites)
    ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Test and reload
    if nginx -t; then
        systemctl reload nginx
        log_success "Nginx configured!"
    else
        log_error "Nginx config test failed!"
        # Restore backup
        if [ -f "$BACKUP_DIR/$BACKUP_NAME" ]; then
            cp "$BACKUP_DIR/$BACKUP_NAME" "$NGINX_CONF"
            nginx -t && systemctl reload nginx
            log_warning "Restored previous config"
        fi
    fi
}

# =====================================================
# 7. Setup SSL with Let's Encrypt (skip if exists)
# =====================================================
setup_ssl() {
    log_info "Checking SSL certificate..."
    
    # Check if certificate already exists and is valid
    if [ -f "/etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem" ]; then
        # Check expiry
        EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem 2>/dev/null | cut -d= -f2)
        log_info "SSL certificate exists, expires: $EXPIRY"
        
        # Try to renew if needed
        certbot renew --dry-run 2>/dev/null && log_info "Certificate is valid" || log_warning "Certificate may need renewal"
        
        # Reconfigure nginx with SSL
        configure_nginx
        
        log_success "SSL ready!"
        return
    fi
    
    log_info "Setting up new SSL certificate..."
    
    # Make sure nginx is running with HTTP config first
    configure_nginx
    
    # Get certificate
    certbot certonly --webroot -w /var/www/html -d magiamhot.io.vn -d www.magiamhot.io.vn \
        --non-interactive --agree-tos --email admin@magiamhot.io.vn || {
        log_error "Failed to get SSL certificate. Make sure DNS is pointing to this server."
        return 1
    }
    
    # Reconfigure nginx with SSL
    configure_nginx
    
    # Setup auto-renewal
    systemctl enable certbot.timer 2>/dev/null || true
    systemctl start certbot.timer 2>/dev/null || true
    
    log_success "SSL configured!"
}

# =====================================================
# 8. Configure PM2 (restart if running, start if not)
# =====================================================
configure_pm2() {
    log_info "Configuring PM2..."
    
    # Create log directory
    mkdir -p /var/log/cryptocrush
    
    cd "$APP_DIR"
    
    # Check if process is already running
    if pm2 describe cryptocrush-api > /dev/null 2>&1; then
        log_info "PM2 process exists, restarting..."
        pm2 restart cryptocrush-api
    else
        log_info "Starting new PM2 process..."
        pm2 start server/src/index.js --name cryptocrush-api \
            --max-memory-restart 500M \
            --log-date-format "YYYY-MM-DD HH:mm:ss" \
            -o /var/log/cryptocrush/app.log \
            -e /var/log/cryptocrush/error.log
    fi
    
    # Save PM2 config
    pm2 save
    
    # Setup PM2 startup (safe to run multiple times)
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    log_success "PM2 configured!"
}

# =====================================================
# 9. Create TON Connect Manifest (only if not exists)
# =====================================================
create_tonconnect_manifest() {
    log_info "Checking TON Connect manifest..."
    
    MANIFEST_FILE="/var/www/html/cryptocrush/tonconnect-manifest.json"
    
    if [ -f "$MANIFEST_FILE" ]; then
        log_info "TON Connect manifest already exists"
        return
    fi
    
    cat > "$MANIFEST_FILE" << 'EOF'
{
  "url": "https://magiamhot.io.vn",
  "name": "CryptoCrush",
  "iconUrl": "https://magiamhot.io.vn/logo192.png",
  "termsOfUseUrl": "https://magiamhot.io.vn/terms",
  "privacyPolicyUrl": "https://magiamhot.io.vn/privacy"
}
EOF

    log_success "TON Connect manifest created!"
}

# =====================================================
# 10. Quick Update (git pull + restart, preserve data)
# =====================================================
quick_update() {
    log_info "Quick update - pulling latest code..."
    
    cd "$APP_DIR"
    
    # Stash any local changes
    git stash 2>/dev/null || true
    
    # Pull latest
    git pull origin main
    
    # Rebuild frontend only
    cd "$APP_DIR/client"
    npm install
    npm run build
    
    # Sync build (preserves, updates)
    rsync -av --delete dist/ /var/www/html/cryptocrush/ 2>/dev/null || cp -r dist/* /var/www/html/cryptocrush/
    
    # Ensure tonconnect manifest exists
    create_tonconnect_manifest
    
    # Restart backend (preserves env)
    pm2 restart cryptocrush-api
    
    log_success "Quick update complete!"
}

# =====================================================
# 11. Status Check
# =====================================================
check_status() {
    echo ""
    log_info "=== System Status ==="
    echo ""
    
    # Node.js
    echo -n "Node.js: "
    node -v 2>/dev/null || echo "Not installed"
    
    # PM2
    echo -n "PM2: "
    pm2 -v 2>/dev/null || echo "Not installed"
    
    # PostgreSQL
    echo -n "PostgreSQL: "
    systemctl is-active postgresql 2>/dev/null || echo "Not running"
    
    # Nginx
    echo -n "Nginx: "
    systemctl is-active nginx 2>/dev/null || echo "Not running"
    
    # SSL
    echo -n "SSL Certificate: "
    if [ -f "/etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem" ]; then
        openssl x509 -enddate -noout -in /etc/letsencrypt/live/magiamhot.io.vn/fullchain.pem 2>/dev/null | cut -d= -f2
    else
        echo "Not configured"
    fi
    
    # PM2 processes
    echo ""
    log_info "=== PM2 Processes ==="
    pm2 list 2>/dev/null || echo "No processes"
    
    # Database tables
    echo ""
    log_info "=== Database Tables ==="
    export PGPASSWORD="Cuongnv@123"
    psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -c "\dt" 2>/dev/null || echo "Cannot connect"
    
    echo ""
}

# =====================================================
# Menu
# =====================================================
# =====================================================
# 13. Show Migrations & Packages Info
# =====================================================
show_migrations_info() {
    echo ""
    log_info "=== Database Migrations ==="
    echo ""
    echo -e "${YELLOW}database/migrations/ (15 files):${NC}"
    echo "  001_initial_schema.sql          - Core tables (users, swipes, relationships)"
    echo "  001_initial_schema_no_postgis.sql - No PostGIS version"
    echo "  002_add_messages.sql            - Chat/messaging system"
    echo "  003_add_disputes.sql            - Dispute resolution"
    echo "  004_add_blurred_images.sql      - Blurred image system"
    echo "  005_add_tasks_referrals.sql     - Tasks & referrals"
    echo "  006_add_bot_users.sql           - Bot user generation"
    echo "  007_add_price_history.sql       - Price history tracking"
    echo "  008_add_yield_farming.sql       - Yield farming system"
    echo "  009_add_boost_system.sql        - Profile boost"
    echo "  010_add_fud_system.sql          - FUD mechanism"
    echo "  012_add_joint_balance.sql       - Joint Venture (Chat-to-Earn)"
    echo "  013_add_message_type.sql        - Message types (TEXT/IMAGE/STICKER)"
    echo "  014_add_nft_fields.sql          - NFT certificate fields"
    echo "  015_create_markets_for_existing.sql - Markets for minted contracts"
    echo ""
    echo -e "${YELLOW}server/migrations/ (1 file):${NC}"
    echo "  011_add_is_vip_column.sql       - VIP user support"
    echo ""
    log_info "=== Critical NPM Packages (Server) ==="
    echo ""
    echo "  @faker-js/faker  - Market maker bot users (ESM module)"
    echo "  canvas           - NFT certificate image generation"
    echo "  cors             - CORS handling"
    echo "  dotenv           - Environment variables"
    echo "  express          - Web framework"
    echo "  grammy           - Telegram bot library"
    echo "  helmet           - Security headers"
    echo "  multer           - File upload handling (avatars)"
    echo "  node-cron        - Scheduled tasks (market maker)"
    echo "  pg               - PostgreSQL client"
    echo "  socket.io        - Real-time WebSocket (Chat)"
    echo ""
    log_info "=== Server Scripts ==="
    echo ""
    echo "  scripts/create-markets.js        - Create prediction markets"
    echo "  scripts/regenerate-certificates.js - Regenerate missing NFT certs"
    echo ""
    log_info "=== Public Directories ==="
    echo ""
    echo "  /public/certificates/  - NFT certificate images"
    echo "  /public/avatars/       - User uploaded profile photos"
    echo ""
    log_info "=== Required Environment Variables ==="
    echo ""
    echo "  PORT, NODE_ENV, DEV_BYPASS_AUTH"
    echo "  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo "  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD"
    echo "  BOT_TOKEN, TELEGRAM_BOT_TOKEN"
    echo "  CORS_ORIGIN, TONCONNECT_MANIFEST_URL"
    echo ""
}

show_menu() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  CryptoCrush Local Deployment Script${NC}"
    echo -e "${GREEN}  Domain: ${DOMAIN}${NC}"
    echo -e "${GREEN}  IDEMPOTENT: Safe to run multiple times${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "1) Full deployment (all steps)"
    echo "2) Install dependencies only"
    echo "3) Setup database only"
    echo "4) Run migrations only"
    echo "5) Seed VIP profiles"
    echo "6) Create prediction markets"
    echo "7) Regenerate NFT certificates"
    echo "8) Configure environment only"
    echo "9) Build application only"
    echo "10) Configure Nginx only"
    echo "11) Setup SSL only"
    echo "12) Configure PM2 only"
    echo "13) Quick update (git pull + rebuild + restart)"
    echo "14) Check status"
    echo "15) Show migrations & packages info"
    echo "0) Exit"
    echo ""
}

full_deployment() {
    log_info "Starting full deployment..."
    
    install_dependencies
    setup_database
    run_migrations
    seed_vip_profiles
    create_prediction_markets
    regenerate_certificates
    configure_env
    build_app
    configure_nginx
    setup_ssl
    configure_pm2
    create_tonconnect_manifest
    
    echo ""
    log_success "========================================="
    log_success "  DEPLOYMENT COMPLETE!"
    log_success "========================================="
    echo ""
    echo -e "Frontend: ${GREEN}https://${DOMAIN}${NC}"
    echo -e "API:      ${GREEN}https://${DOMAIN}/api${NC}"
    echo ""
    echo "Commands:"
    echo "  pm2 logs cryptocrush-api  - View logs"
    echo "  pm2 restart cryptocrush-api - Restart app"
    echo "  pm2 status - Check status"
    echo ""
}

# =====================================================
# Main
# =====================================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./deploy-local.sh)"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "$APP_DIR/package.json" ] && [ ! -d "$APP_DIR/server" ]; then
    log_warning "App directory not found at $APP_DIR"
    log_info "Current directory: $(pwd)"
    
    if [ -d "./server" ]; then
        APP_DIR="$(pwd)"
        log_info "Using current directory as APP_DIR: $APP_DIR"
    else
        log_error "Cannot find application. Please run from /var/www/SocialFi"
        exit 1
    fi
fi

show_menu
read -p "Select option: " choice

case $choice in
    1) full_deployment ;;
    2) install_dependencies ;;
    3) setup_database ;;
    4) run_migrations ;;
    5) seed_vip_profiles ;;
    6) create_prediction_markets ;;
    7) regenerate_certificates ;;
    8) configure_env ;;
    9) build_app ;;
    10) configure_nginx ;;
    11) setup_ssl ;;
    12) configure_pm2 ;;
    13) quick_update ;;
    14) check_status ;;
    15) show_migrations_info ;;
    0) exit 0 ;;
    *) log_error "Invalid option" ;;
esac
