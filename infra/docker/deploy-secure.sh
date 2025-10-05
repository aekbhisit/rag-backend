#!/bin/bash

# RAG Backend Secure Deployment Script
# This script helps deploy the secure Docker Compose configuration

set -e  # Exit on any error

echo "🔒 RAG Backend Secure Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use docker-compose or docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

print_status "Using Docker Compose command: $COMPOSE_CMD"

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f "x.env.prod" ]; then
        print_warning ".env file not found. Copying from x.env.prod..."
        cp x.env.prod .env
        print_warning "IMPORTANT: Please edit .env file with your secure passwords before continuing!"
        print_warning "Run: nano .env"
        read -p "Press Enter after you have updated the .env file with secure passwords..."
    else
        print_error ".env file not found and x.env.prod template is missing"
        exit 1
    fi
fi

# Validate environment variables
print_status "Validating environment variables..."

source .env

# Check critical variables
if [[ "$POSTGRES_PASSWORD" == *"change_this"* ]] || [[ "$POSTGRES_PASSWORD" == "password" ]]; then
    print_error "POSTGRES_PASSWORD still contains default value. Please change it in .env file"
    exit 1
fi

if [[ "$REDIS_PASSWORD" == *"change_this"* ]] || [[ "$REDIS_PASSWORD" == "redis123" ]]; then
    print_error "REDIS_PASSWORD still contains default value. Please change it in .env file"
    exit 1
fi

if [[ "$MINIO_ROOT_PASSWORD" == *"change_this"* ]] || [[ "$MINIO_ROOT_PASSWORD" == "minio123" ]]; then
    print_error "MINIO_ROOT_PASSWORD still contains default value. Please change it in .env file"
    exit 1
fi

if [[ "$JWT_SECRET" == *"change_this"* ]] || [[ "$JWT_SECRET" == "your_jwt_secret"* ]]; then
    print_error "JWT_SECRET still contains default value. Please change it in .env file"
    exit 1
fi

if [[ ${#JWT_SECRET} -lt 32 ]]; then
    print_error "JWT_SECRET must be at least 32 characters long"
    exit 1
fi

if [[ "$ADMIN_PASSWORD" == *"change_this"* ]] || [[ "$ADMIN_PASSWORD" == "password" ]]; then
    print_error "ADMIN_PASSWORD still contains default value. Please change it in .env file"
    exit 1
fi

print_success "Environment variables validated"

# Create necessary directories
print_status "Creating data directories..."
mkdir -p data/{logs,uploads,temp,postgres,redis,minio,backups}
mkdir -p scripts

# Set proper permissions
chmod 755 data/
chmod 700 data/{postgres,redis,minio}

print_success "Data directories created with proper permissions"

# Check if logrotate config exists
if [ ! -f "scripts/logrotate.conf" ]; then
    print_warning "logrotate.conf not found. Creating default configuration..."
    cat > scripts/logrotate.conf << 'EOF'
# Log rotation configuration for RAG Backend
/var/log/app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 1000 1000
    postrotate
        /bin/true
    endscript
}

/var/log/app/security/*.log {
    daily
    missingok
    rotate 90
    compress
    delaycompress
    notifempty
    create 644 1000 1000
}

/var/log/app/error/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 1000 1000
}
EOF
    print_success "Created logrotate configuration"
fi

# Build images
print_status "Building Docker images..."
$COMPOSE_CMD -f docker-compose.prod.secure.fixed.yml build

print_success "Docker images built successfully"

# Start services
print_status "Starting services..."
$COMPOSE_CMD -f docker-compose.prod.secure.fixed.yml up -d

print_success "Services started successfully"

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check backend health
if curl -f http://localhost:3001/health &> /dev/null; then
    print_success "Backend service is healthy"
else
    print_warning "Backend service health check failed"
fi

# Check admin web health
if curl -f http://localhost:3000 &> /dev/null; then
    print_success "Admin web service is healthy"
else
    print_warning "Admin web service health check failed"
fi

# Check travel AI bot health
if curl -f http://localhost:3200 &> /dev/null; then
    print_success "Travel AI bot service is healthy"
else
    print_warning "Travel AI bot service health check failed"
fi

# Display service information
echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo ""
echo "Service URLs:"
echo "  Backend API:     http://localhost:3001"
echo "  Admin Web:       http://localhost:3000"
echo "  Travel AI Bot:   http://localhost:3200"
echo "  MinIO API:       http://localhost:9000"
echo ""
echo "Admin Credentials:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: [as configured in .env file]"
echo ""
echo "Useful Commands:"
echo "  View logs:       $COMPOSE_CMD -f docker-compose.prod.secure.fixed.yml logs -f"
echo "  Stop services:   $COMPOSE_CMD -f docker-compose.prod.secure.fixed.yml down"
echo "  Restart:         $COMPOSE_CMD -f docker-compose.prod.secure.fixed.yml restart"
echo ""
echo "🔒 Security Notes:"
echo "  - Database and Redis are not exposed externally"
echo "  - MinIO console is not exposed externally"
echo "  - All containers run as non-root users"
echo "  - Log rotation is enabled"
echo "  - Resource limits are applied"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Set up reverse proxy (Nginx/Traefik) with HTTPS"
echo "  2. Configure firewall rules"
echo "  3. Set up automated backups"
echo "  4. Configure monitoring and alerting"
echo ""

print_success "Secure deployment completed!"
