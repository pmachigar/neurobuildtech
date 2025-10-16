#!/bin/bash
# InfluxDB Backup Script
# This script creates backups of InfluxDB data and metadata

set -e

# Configuration
INFLUXDB_HOST="${INFLUXDB_HOST:-localhost}"
INFLUXDB_PORT="${INFLUXDB_PORT:-8086}"
INFLUXDB_TOKEN="${INFLUXDB_ADMIN_TOKEN}"
INFLUXDB_ORG="${INFLUXDB_ORG:-neurobuildtech}"
BACKUP_DIR="${BACKUP_PATH:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-90}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="influxdb_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required variables are set
check_config() {
    if [ -z "$INFLUXDB_TOKEN" ]; then
        log_error "INFLUXDB_ADMIN_TOKEN is not set"
        exit 1
    fi
    
    log_info "Configuration check passed"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    mkdir -p "$BACKUP_PATH"
    log_info "Created backup directory: $BACKUP_PATH"
}

# Perform InfluxDB backup
perform_backup() {
    log_info "Starting InfluxDB backup..."
    
    # Backup using influx CLI
    if command -v influx &> /dev/null; then
        log_info "Using influx CLI for backup"
        influx backup "$BACKUP_PATH" \
            --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
            --token "$INFLUXDB_TOKEN" \
            --org "$INFLUXDB_ORG"
    else
        log_error "influx CLI not found. Please install InfluxDB CLI tools."
        exit 1
    fi
    
    if [ $? -eq 0 ]; then
        log_info "Backup completed successfully"
    else
        log_error "Backup failed"
        exit 1
    fi
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    
    if [ $? -eq 0 ]; then
        log_info "Backup compressed to ${BACKUP_NAME}.tar.gz"
        # Remove uncompressed backup
        rm -rf "${BACKUP_NAME}"
    else
        log_error "Compression failed"
        exit 1
    fi
}

# Calculate backup size
calculate_backup_size() {
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"
}

# Clean old backups
clean_old_backups() {
    log_info "Cleaning backups older than ${BACKUP_RETENTION_DAYS} days..."
    
    find "$BACKUP_DIR" -name "influxdb_backup_*.tar.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
    
    if [ $? -eq 0 ]; then
        log_info "Old backups cleaned"
    else
        log_warn "Failed to clean old backups"
    fi
}

# Generate backup manifest
generate_manifest() {
    MANIFEST_FILE="${BACKUP_DIR}/${BACKUP_NAME}.manifest"
    
    cat > "$MANIFEST_FILE" << EOF
Backup Information
==================
Backup Name: ${BACKUP_NAME}
Timestamp: ${TIMESTAMP}
Date: $(date)
InfluxDB Host: ${INFLUXDB_HOST}:${INFLUXDB_PORT}
Organization: ${INFLUXDB_ORG}
Backup Size: ${BACKUP_SIZE}
Retention Days: ${BACKUP_RETENTION_DAYS}
EOF
    
    log_info "Backup manifest created: $MANIFEST_FILE"
}

# Send notification (optional - implement based on your notification system)
send_notification() {
    log_info "Backup notification would be sent here (not implemented)"
    # Implement your notification logic here (email, Slack, etc.)
}

# Main execution
main() {
    log_info "=========================================="
    log_info "InfluxDB Backup Script Started"
    log_info "=========================================="
    
    check_config
    create_backup_dir
    perform_backup
    compress_backup
    calculate_backup_size
    generate_manifest
    clean_old_backups
    send_notification
    
    log_info "=========================================="
    log_info "Backup completed successfully!"
    log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "=========================================="
}

# Run main function
main
