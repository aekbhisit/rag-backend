#!/bin/bash

# Manual Backup Script for RAG Assistant
# Usage: ./manual-backup.sh [backup_type] [retention_days]

set -e

# Configuration
BACKUP_DIR="./data/backups"
RETENTION_DAYS=${2:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="manual_backup_${TIMESTAMP}"

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
    echo "Usage: $0 [backup_type] [retention_days]"
    echo ""
    echo "Backup types:"
    echo "  db          - Database backup only"
    echo "  volumes     - Application volumes backup only"
    echo "  full        - Full backup (database + volumes)"
    echo "  restore     - Restore from backup file"
    echo ""
    echo "Examples:"
    echo "  $0 db 7        - Database backup with 7 days retention"
    echo "  $0 volumes 30  - Volumes backup with 30 days retention"
    echo "  $0 full 14     - Full backup with 14 days retention"
    echo "  $0 restore     - Restore from backup"
    echo ""
    echo "Default retention: 7 days"
}

# Database backup function
backup_database() {
    log "Creating database backup..."
    
    # Check if postgres container is running
    if ! docker ps | grep -q rag-postgres; then
        error "PostgreSQL container is not running. Start the stack first."
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "${BACKUP_DIR}"
    
    # Perform database backup
    if docker exec rag-postgres pg_dump -U postgres -d rag_assistant \
        --format=custom --verbose --file="/backups/${BACKUP_NAME}_db.dump"; then
        log "Database backup completed successfully"
        
        # Copy backup from container to host
        docker cp rag-postgres:/backups/${BACKUP_NAME}_db.dump "${BACKUP_DIR}/"
        
        # Create compressed archive
        cd "${BACKUP_DIR}"
        tar -czf "${BACKUP_NAME}_db.tar.gz" "${BACKUP_NAME}_db.dump" --remove-files
        
        log "Database backup archived: ${BACKUP_NAME}_db.tar.gz"
        log "Backup size: $(du -h "${BACKUP_NAME}_db.tar.gz" | cut -f1)"
    else
        error "Database backup failed"
        exit 1
    fi
}

# Volumes backup function
backup_volumes() {
    log "Creating volumes backup..."
    
    # Create backup directory
    mkdir -p "${BACKUP_DIR}"
    
    # Check if volumes exist
    if [ ! -d "./data/postgres" ] && [ ! -d "./data/redis" ] && [ ! -d "./data/minio" ]; then
        warn "No volume data found. Skipping volumes backup."
        return
    fi
    
    # Create volumes backup
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}_volumes.tar.gz" \
        -C ../.. \
        data/postgres \
        data/redis \
        data/minio \
        data/logs \
        data/uploads \
        data/temp \
        2>/dev/null || warn "Some volumes could not be backed up"
    
    log "Volumes backup completed: ${BACKUP_NAME}_volumes.tar.gz"
    log "Backup size: $(du -h "${BACKUP_NAME}_volumes.tar.gz" | cut -f1)"
}

# Full backup function
backup_full() {
    log "Creating full backup..."
    backup_database
    backup_volumes
    
    # Create a combined archive
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}_full.tar.gz" \
        "${BACKUP_NAME}_db.tar.gz" \
        "${BACKUP_NAME}_volumes.tar.gz" \
        --remove-files
    
    log "Full backup completed: ${BACKUP_NAME}_full.tar.gz"
    log "Backup size: $(du -h "${BACKUP_NAME}_full.tar.gz" | cut -f1)"
}

# Restore function
restore_backup() {
    log "Restore functionality..."
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*.tar.gz 2>/dev/null || echo "No backups found"
    
    echo ""
    echo "To restore:"
    echo "1. Stop the stack: docker-compose -f docker-compose.prod.yml down"
    echo "2. Extract backup: tar -xzf backup_file.tar.gz"
    echo "3. Restore volumes: copy extracted data to ./data/"
    echo "4. Restore database: docker exec -i rag-postgres pg_restore -U postgres -d rag_assistant < backup.dump"
    echo "5. Start the stack: docker-compose -f docker-compose.prod.yml up -d"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    find "${BACKUP_DIR}" -name "*_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    log "Cleanup completed"
}

# Main execution
main() {
    # Check if running from correct directory
    if [ ! -f "docker-compose.prod.yml" ]; then
        error "Please run this script from the infra/docker directory"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "${BACKUP_DIR}"
    
    case "${1:-full}" in
        "db")
            backup_database
            ;;
        "volumes")
            backup_volumes
            ;;
        "full")
            backup_full
            ;;
        "restore")
            restore_backup
            exit 0
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            error "Invalid backup type: $1"
            show_usage
            exit 1
            ;;
    esac
    
    # Cleanup old backups
    cleanup_old_backups
    
    log "Backup process completed successfully"
    log "Backup location: ${BACKUP_DIR}"
}

# Run main function
main "$@"
