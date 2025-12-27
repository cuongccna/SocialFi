#!/bin/bash

# =====================================================
# CryptoCrush SocialFi - Local VPS Deployment Script
# Run this script DIRECTLY on VPS (not via SSH)
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
DOMAIN="dilink.click"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =====================================================
# 1. Install System Dependencies
# =====================================================
install_dependencies() {
    log_info "Installing system dependencies..."
    
    apt-get update
    apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
    
    # Install Node.js 20.x if not installed
    if ! command -v node &> /dev/null; then
        log_info "Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        npm install -g pm2
    fi
    
    log_success "Dependencies installed!"
}

# =====================================================
# 2. Setup PostgreSQL Database
# =====================================================
setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create user and database
    sudo -u postgres psql -c "CREATE USER CryptoCrush_user WITH PASSWORD 'Cuongnv@123';" 2>/dev/null || log_warning "User already exists"
    sudo -u postgres psql -c "CREATE DATABASE CryptoCrush_db OWNER CryptoCrush_user;" 2>/dev/null || log_warning "Database already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE CryptoCrush_db TO CryptoCrush_user;"
    
    log_success "Database configured!"
}

# =====================================================
# 3. Run Database Migrations
# =====================================================
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$APP_DIR/database/migrations"
    
    export PGPASSWORD="Cuongnv@123"
    
    for file in *.sql; do
        if [ -f "$file" ]; then
            log_info "Running migration: $file"
            psql -h localhost -U CryptoCrush_user -d CryptoCrush_db -f "$file" 2>/dev/null || log_warning "Migration $file may have already been applied"
        fi
    done
    
    log_success "Migrations complete!"
}

# =====================================================
# 4. Configure Environment
# =====================================================
configure_env() {
    log_info "Configuring environment..."
    
    # Backend .env
    cat > "$APP_DIR/server/.env" << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=production

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CryptoCrush_db
DB_USER=CryptoCrush_user
DB_PASSWORD=Cuongnv@123

# Telegram Bot
BOT_TOKEN=8450445506:AAHTteZ8NBswolK9N91y7d-cet9q5flIloE

# CORS
CORS_ORIGIN=https://dilink.click

# TON Connect (update with your manifest URL)
TONCONNECT_MANIFEST_URL=https://dilink.click/tonconnect-manifest.json
EOF

    log_success "Environment configured!"
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
    
    # Install frontend dependencies and build
    cd "$APP_DIR/client"
    log_info "Installing frontend dependencies..."
    npm install
    
    log_info "Building frontend..."
    npm run build
    
    # Move build to nginx directory
    rm -rf /var/www/html/cryptocrush
    mkdir -p /var/www/html/cryptocrush
    cp -r dist/* /var/www/html/cryptocrush/
    
    log_success "Application built!"
}

# =====================================================
# 6. Configure Nginx
# =====================================================
configure_nginx() {
    log_info "Configuring Nginx..."
    
    cat > /etc/nginx/sites-available/cryptocrush << 'EOF'
# CryptoCrush SocialFi - Nginx Configuration

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=60r/s;

# Upstream for API
upstream cryptocrush_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name dilink.click www.dilink.click;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dilink.click www.dilink.click;
    
    # SSL (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/dilink.click/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dilink.click/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Security headers
    add_header X-Frame-Options "ALLOWALL" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Root for frontend
    root /var/www/html/cryptocrush;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
    
    # API proxy
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
        proxy_connect_timeout 75s;
    }
    
    # TON Connect manifest
    location /tonconnect-manifest.json {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # SPA fallback
    location / {
        limit_req zone=general_limit burst=100 nodelay;
        try_files $uri $uri/ /index.html;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload
    nginx -t && systemctl reload nginx
    
    log_success "Nginx configured!"
}

# =====================================================
# 7. Setup SSL with Let's Encrypt
# =====================================================
setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    # Check if certificate already exists
    if [ -f "/etc/letsencrypt/live/dilink.click/fullchain.pem" ]; then
        log_warning "SSL certificate already exists, skipping..."
        return
    fi
    
    # Get certificate (temporarily use HTTP config)
    cat > /etc/nginx/sites-available/cryptocrush-temp << 'EOF'
server {
    listen 80;
    server_name dilink.click www.dilink.click;
    root /var/www/html/cryptocrush;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/cryptocrush-temp /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/cryptocrush
    nginx -t && systemctl reload nginx
    
    # Get certificate
    certbot certonly --webroot -w /var/www/html -d dilink.click -d www.dilink.click --non-interactive --agree-tos --email admin@dilink.click || {
        log_error "Failed to get SSL certificate. Make sure DNS is pointing to this server."
        # Restore original config without SSL
        rm -f /etc/nginx/sites-enabled/cryptocrush-temp
        return
    }
    
    # Restore full config
    rm -f /etc/nginx/sites-enabled/cryptocrush-temp
    ln -sf /etc/nginx/sites-available/cryptocrush /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    log_success "SSL configured!"
}

# =====================================================
# 8. Configure PM2
# =====================================================
configure_pm2() {
    log_info "Configuring PM2..."
    
    cd "$APP_DIR"
    
    # Stop existing instance if running
    pm2 delete cryptocrush-api 2>/dev/null || true
    
    # Start application
    pm2 start server/src/index.js --name cryptocrush-api \
        --max-memory-restart 500M \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        -o /var/log/cryptocrush/app.log \
        -e /var/log/cryptocrush/error.log
    
    # Create log directory
    mkdir -p /var/log/cryptocrush
    
    # Save PM2 config
    pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root
    
    log_success "PM2 configured!"
}

# =====================================================
# 9. Create TON Connect Manifest
# =====================================================
create_tonconnect_manifest() {
    log_info "Creating TON Connect manifest..."
    
    cat > /var/www/html/cryptocrush/tonconnect-manifest.json << 'EOF'
{
  "url": "https://dilink.click",
  "name": "CryptoCrush",
  "iconUrl": "https://dilink.click/logo192.png",
  "termsOfUseUrl": "https://dilink.click/terms",
  "privacyPolicyUrl": "https://dilink.click/privacy"
}
EOF

    log_success "TON Connect manifest created!"
}

# =====================================================
# 10. Quick Update (git pull + restart)
# =====================================================
quick_update() {
    log_info "Quick update - pulling latest code..."
    
    cd "$APP_DIR"
    git pull origin main
    
    # Rebuild frontend
    cd "$APP_DIR/client"
    npm install
    npm run build
    cp -r dist/* /var/www/html/cryptocrush/
    
    # Restart backend
    pm2 restart cryptocrush-api
    
    log_success "Quick update complete!"
}

# =====================================================
# Menu
# =====================================================
show_menu() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  CryptoCrush Local Deployment Script${NC}"
    echo -e "${GREEN}  Domain: ${DOMAIN}${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "1) Full deployment (all steps)"
    echo "2) Install dependencies only"
    echo "3) Setup database only"
    echo "4) Run migrations only"
    echo "5) Configure environment only"
    echo "6) Build application only"
    echo "7) Configure Nginx only"
    echo "8) Setup SSL only"
    echo "9) Configure PM2 only"
    echo "10) Quick update (git pull + rebuild + restart)"
    echo "0) Exit"
    echo ""
}

full_deployment() {
    log_info "Starting full deployment..."
    
    install_dependencies
    setup_database
    run_migrations
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
    5) configure_env ;;
    6) build_app ;;
    7) configure_nginx ;;
    8) setup_ssl ;;
    9) configure_pm2 ;;
    10) quick_update ;;
    0) exit 0 ;;
    *) log_error "Invalid option" ;;
esac
