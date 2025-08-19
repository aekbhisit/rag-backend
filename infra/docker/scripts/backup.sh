#!/bin/bash

# RAG Assistant Backup Script
# This script performs automated backups of the database and application data

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="rag_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting backup process: ${BACKUP_NAME}"

# 1. Database Backup
log "Creating database backup..."
if pg_dump -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --format=custom --verbose --file="${BACKUP_DIR}/${BACKUP_NAME}_db.dump"; then
    log "Database backup completed successfully"
else
    error "Database backup failed"
    exit 1
fi

# 2. Create a compressed archive of the backup
log "Creating compressed archive..."
cd "${BACKUP_DIR}"
if tar -czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}_db.dump" \
    --remove-files; then
    log "Compressed archive created: ${BACKUP_NAME}.tar.gz"
else
    error "Failed to create compressed archive"
    exit 1
fi

# 3. Clean up old backups
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "rag_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# 4. Verify backup integrity
log "Verifying backup integrity..."
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ]; then
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
        log "Backup verification successful"
    else
        error "Backup verification failed - archive is corrupted"
        exit 1
    fi
else
    error "Backup file not found after creation"
    exit 1
fi

# 5. Log backup completion
log "Backup completed successfully: ${BACKUP_NAME}.tar.gz"
log "Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"

# 6. Optional: Upload to remote storage (uncomment and configure as needed)
# log "Uploading backup to remote storage..."
# if aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://your-backup-bucket/"; then
#     log "Backup uploaded to S3 successfully"
# else
#     warn "Failed to upload backup to S3"
# fi

# 7. Send notification (uncomment and configure as needed)
# log "Sending backup notification..."
# if curl -X POST "https://your-webhook-url" \
#     -H "Content-Type: application/json" \
#     -d "{\"text\":\"Backup completed: ${BACKUP_NAME}.tar.gz\"}"; then
#     log "Notification sent successfully"
# else
#     warn "Failed to send notification"
# fi

log "Backup process completed successfully"
exit 0
