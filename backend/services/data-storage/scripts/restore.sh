#!/bin/bash
# InfluxDB Restore Script
# This script restores InfluxDB data from a backup

set -e

# Configuration
INFLUXDB_HOST="${INFLUXDB_HOST:-localhost}"
INFLUXDB_PORT="${INFLUXDB_PORT:-8086}"
INFLUXDB_TOKEN="${INFLUXDB_ADMIN_TOKEN}"
INFLUXDB_ORG="${INFLUXDB_ORG:-neurobuildtech}"
BACKUP_DIR="${BACKUP_PATH:-/backups}"

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

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -f, --file <backup_file>    Path to backup file (tar.gz)
    -l, --list                  List available backups
    -h, --help                  Display this help message

Examples:
    $0 --list
    $0 --file /backups/influxdb_backup_20251016_120000.tar.gz
EOF
    exit 1
}

# List available backups
list_backups() {
    log_info "Available backups in $BACKUP_DIR:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "influxdb_backup_*.tar.gz" -type f -printf "%T@ %Tc %p\n" | sort -rn | cut -d' ' -f2- | nl
        
        if [ ${PIPESTATUS[0]} -ne 0 ] || [ -z "$(find "$BACKUP_DIR" -name "influxdb_backup_*.tar.gz" -type f)" ]; then
            log_warn "No backups found in $BACKUP_DIR"
        fi
    else
        log_error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi
    
    exit 0
}

# Check if required variables are set
check_config() {
    if [ -z "$INFLUXDB_TOKEN" ]; then
        log_error "INFLUXDB_ADMIN_TOKEN is not set"
        exit 1
    fi
    
    log_info "Configuration check passed"
}

# Validate backup file
validate_backup_file() {
    BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Backup file not specified"
        usage
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    if [[ ! "$BACKUP_FILE" =~ \.tar\.gz$ ]]; then
        log_error "Backup file must be a .tar.gz file"
        exit 1
    fi
    
    log_info "Backup file validated: $BACKUP_FILE"
}

# Extract backup
extract_backup() {
    BACKUP_FILE=$1
    EXTRACT_DIR="/tmp/influxdb_restore_$(date +%Y%m%d_%H%M%S)"
    
    log_info "Extracting backup to temporary directory..."
    mkdir -p "$EXTRACT_DIR"
    
    tar -xzf "$BACKUP_FILE" -C "$EXTRACT_DIR"
    
    if [ $? -eq 0 ]; then
        log_info "Backup extracted successfully to $EXTRACT_DIR"
        EXTRACTED_BACKUP_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d -name "influxdb_backup_*" | head -n 1)
        
        if [ -z "$EXTRACTED_BACKUP_DIR" ]; then
            log_error "Could not find extracted backup directory"
            rm -rf "$EXTRACT_DIR"
            exit 1
        fi
    else
        log_error "Failed to extract backup"
        rm -rf "$EXTRACT_DIR"
        exit 1
    fi
}

# Confirm restore operation
confirm_restore() {
    log_warn "=========================================="
    log_warn "WARNING: This operation will restore data"
    log_warn "Backup file: $BACKUP_FILE"
    log_warn "Target: ${INFLUXDB_HOST}:${INFLUXDB_PORT}"
    log_warn "Organization: $INFLUXDB_ORG"
    log_warn "=========================================="
    
    read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Restore operation cancelled"
        cleanup
        exit 0
    fi
}

# Perform restore
perform_restore() {
    log_info "Starting InfluxDB restore..."
    
    if command -v influx &> /dev/null; then
        log_info "Using influx CLI for restore"
        
        influx restore "$EXTRACTED_BACKUP_DIR" \
            --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
            --token "$INFLUXDB_TOKEN" \
            --org "$INFLUXDB_ORG" \
            --full
        
        if [ $? -eq 0 ]; then
            log_info "Restore completed successfully"
        else
            log_error "Restore failed"
            cleanup
            exit 1
        fi
    else
        log_error "influx CLI not found. Please install InfluxDB CLI tools."
        cleanup
        exit 1
    fi
}

# Cleanup temporary files
cleanup() {
    if [ -n "$EXTRACT_DIR" ] && [ -d "$EXTRACT_DIR" ]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$EXTRACT_DIR"
        log_info "Cleanup completed"
    fi
}

# Verify restore
verify_restore() {
    log_info "Verifying restore..."
    
    # Test connection to InfluxDB
    if command -v influx &> /dev/null; then
        influx ping --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}"
        
        if [ $? -eq 0 ]; then
            log_info "InfluxDB is responding correctly"
        else
            log_warn "Could not verify InfluxDB connection"
        fi
    fi
}

# Main execution
main() {
    BACKUP_FILE=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -l|--list)
                list_backups
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "No backup file specified"
        usage
    fi
    
    log_info "=========================================="
    log_info "InfluxDB Restore Script Started"
    log_info "=========================================="
    
    check_config
    validate_backup_file "$BACKUP_FILE"
    extract_backup "$BACKUP_FILE"
    confirm_restore
    perform_restore
    verify_restore
    cleanup
    
    log_info "=========================================="
    log_info "Restore completed successfully!"
    log_info "=========================================="
}

# Handle script interruption
trap cleanup EXIT INT TERM

# Run main function
main "$@"
