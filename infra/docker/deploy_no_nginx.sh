#!/bin/bash

# RAG Assistant Production Deployment Script
# Usage: ./deploy.sh [action] [options]

set -e

# Configuration
COMPOSE_FILE="docker-compose.prod_no_nginx.yml"
ENV_FILE=".env"
DATA_DIR="./data"
BACKUP_DIR="./data/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Show usage
show_usage() {
    echo "Usage: $0 [action] [options]"
    echo ""
    echo "Actions:"
    echo "  start       - Start the production stack"
    echo "  stop        - Stop the production stack"
    echo "  restart     - Restart the production stack"
    echo "  status      - Show status of all services"
    echo "  logs        - Show logs for all services"
    echo "  logs [svc]  - Show logs for specific service"
    echo "  update      - Update and restart the stack"
    echo "  backup      - Create manual backup"
    echo "  restore     - Restore from backup"
    echo "  clean       - Clean up old data and logs"
    echo "  setup       - Initial setup and configuration"
    echo "  db-setup    - Setup database and insert default data"
    echo ""
    echo "Examples:"
    echo "  $0 start        - Start the stack"
    echo "  $0 logs nginx   - Show nginx logs"
    echo "  $0 backup       - Create backup"
    echo "  $0 setup        - Initial setup"
}

# Check if running from correct directory
check_directory() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Please run this script from the infra/docker directory"
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file .env not found. Please copy env.example to .env and configure it."
        exit 1
    fi
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    mkdir -p "$DATA_DIR"/{postgres,redis,minio,logs,uploads,temp,backups,ssl}
    mkdir -p "$DATA_DIR"/logs/{nginx,app}
    log "Directories created successfully"
}

# Generate self-signed SSL certificate (for development)
generate_ssl() {
    if [ ! -f "$DATA_DIR/ssl/cert.pem" ] || [ ! -f "$DATA_DIR/ssl/key.pem" ]; then
        log "Generating self-signed SSL certificate..."
        mkdir -p "$DATA_DIR/ssl"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$DATA_DIR/ssl/key.pem" \
            -out "$DATA_DIR/ssl/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        log "SSL certificate generated"
    else
        log "SSL certificate already exists"
    fi
}

# Start the stack
start_stack() {
    log "Starting production stack..."
    docker-compose -f "$COMPOSE_FILE" up -d
    log "Stack started successfully"
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Setup database and insert default data
    setup_database
    
    # Check service status
    docker-compose -f "$COMPOSE_FILE" ps
}

# Stop the stack
stop_stack() {
    log "Stopping production stack..."
    docker-compose -f "$COMPOSE_FILE" down
    log "Stack stopped successfully"
}

# Restart the stack
restart_stack() {
    log "Restarting production stack..."
    docker-compose -f "$COMPOSE_FILE" restart
    log "Stack restarted successfully"
}

# Show status
show_status() {
    log "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# Show logs
show_logs() {
    local service=${1:-""}
    if [ -z "$service" ]; then
        log "Showing logs for all services..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        log "Showing logs for $service..."
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# Update and restart
update_stack() {
    log "Updating production stack..."
    
    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Rebuild and restart
    docker-compose -f "$COMPOSE_FILE" up -d --build
    
    log "Stack updated and restarted successfully"
}

# Create backup
create_backup() {
    log "Creating backup..."
    if [ -f "./scripts/manual-backup.sh" ]; then
        chmod +x ./scripts/manual-backup.sh
        ./scripts/manual-backup.sh full
    else
        error "Backup script not found"
        exit 1
    fi
}

# Restore from backup
restore_backup() {
    log "Restore functionality..."
    if [ -f "./scripts/manual-backup.sh" ]; then
        chmod +x ./scripts/manual-backup.sh
        ./scripts/manual-backup.sh restore
    else
        error "Backup script not found"
        exit 1
    fi
}

# Clean up old data
cleanup() {
    log "Cleaning up old data and logs..."
    
    # Clean old logs (keep last 7 days)
    find "$DATA_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Clean old temp files
    find "$DATA_DIR/temp" -type f -mtime +1 -delete 2>/dev/null || true
    
    # Clean Docker system
    docker system prune -f
    
    log "Cleanup completed"
}

# Initial setup
initial_setup() {
    log "Performing initial setup..."
    
    check_directory
    check_env
    setup_directories
    generate_ssl
    
    log "Initial setup completed successfully"
    log "Please review and configure your .env file before starting the stack"
    log "Then run: $0 start"
}

# Setup database and insert default data
setup_database() {
    log "Setting up database and inserting default data..."
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Check if database exists and create if needed
    log "Checking database connection..."
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null 2>&1 || {
        log "Database connection failed, waiting longer..."
        sleep 20
    }
    
    # Run database initialization scripts
    log "Running database initialization scripts..."
    
    # Initialize database tables
    log "Creating database tables..."
    docker-compose -f "$COMPOSE_FILE" exec -T rag-backend npm run setup:db || {
        warn "Database initialization failed, will retry after container restart"
    }
    
    # Ensure tenant exists
    log "Creating default tenant..."
    docker-compose -f "$COMPOSE_FILE" exec -T rag-backend npm run ensure:tenant || {
        warn "Tenant creation failed, will retry after container restart"
    }
    
    # Ensure admin user exists
    log "Creating default admin user..."
    docker-compose -f "$COMPOSE_FILE" exec -T rag-backend npm run ensure:admin-user || {
        warn "Admin user creation failed, will retry after container restart"
    }
    
    # Insert AI pricing data
    log "Inserting AI pricing data..."
    docker-compose -f "$COMPOSE_FILE" exec -T rag-backend npm run seed:ai-pricing || {
        warn "AI pricing insertion failed, will retry after container restart"
    }
    
    log "Database setup completed"
}

# Main execution
main() {
    case "${1:-help}" in
        "start")
            check_directory
            check_env
            start_stack
            ;;
        "stop")
            check_directory
            stop_stack
            ;;
        "restart")
            check_directory
            restart_stack
            ;;
        "status")
            check_directory
            show_status
            ;;
        "logs")
            check_directory
            show_logs "$2"
            ;;
        "update")
            check_directory
            check_env
            update_stack
            ;;
        "backup")
            check_directory
            create_backup
            ;;
        "restore")
            check_directory
            restore_backup
            ;;
        "clean")
            check_directory
            cleanup
            ;;
        "setup")
            initial_setup
            ;;
        "db-setup")
            check_directory
            check_env
            setup_database
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            error "Invalid action: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
