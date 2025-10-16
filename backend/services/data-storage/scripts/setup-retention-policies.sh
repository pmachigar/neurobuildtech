#!/bin/bash
# Setup InfluxDB Retention Policies and Downsampling Tasks
# This script configures data retention policies and creates downsampling tasks

set -e

# Configuration
INFLUXDB_HOST="${INFLUXDB_HOST:-localhost}"
INFLUXDB_PORT="${INFLUXDB_PORT:-8086}"
INFLUXDB_TOKEN="${INFLUXDB_ADMIN_TOKEN}"
INFLUXDB_ORG="${INFLUXDB_ORG:-neurobuildtech}"

# Bucket configurations
RAW_DATA_BUCKET="sensor_data"
RAW_DATA_RETENTION="${RAW_DATA_RETENTION:-30d}"

BUCKET_1M="sensor_data_1m"
RETENTION_1M="${AGGREGATED_DATA_RETENTION_1M:-90d}"

BUCKET_1H="sensor_data_1h"
RETENTION_1H="${AGGREGATED_DATA_RETENTION_1H:-365d}"

BUCKET_1D="sensor_data_1d"
RETENTION_1D="${AGGREGATED_DATA_RETENTION_1D:-1825d}"  # 5 years

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

# Check if influx CLI is available
check_influx_cli() {
    if ! command -v influx &> /dev/null; then
        log_error "influx CLI not found. Please install InfluxDB CLI tools."
        exit 1
    fi
    log_info "influx CLI found"
}

# Check configuration
check_config() {
    if [ -z "$INFLUXDB_TOKEN" ]; then
        log_error "INFLUXDB_ADMIN_TOKEN is not set"
        exit 1
    fi
    log_info "Configuration check passed"
}

# Create aggregation buckets
create_buckets() {
    log_info "Creating aggregation buckets..."
    
    # Create 1-minute bucket
    log_info "Creating bucket: $BUCKET_1M (retention: $RETENTION_1M)"
    influx bucket create \
        --name "$BUCKET_1M" \
        --org "$INFLUXDB_ORG" \
        --retention "$RETENTION_1M" \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" 2>/dev/null || log_warn "Bucket $BUCKET_1M might already exist"
    
    # Create 1-hour bucket
    log_info "Creating bucket: $BUCKET_1H (retention: $RETENTION_1H)"
    influx bucket create \
        --name "$BUCKET_1H" \
        --org "$INFLUXDB_ORG" \
        --retention "$RETENTION_1H" \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" 2>/dev/null || log_warn "Bucket $BUCKET_1H might already exist"
    
    # Create 1-day bucket
    log_info "Creating bucket: $BUCKET_1D (retention: $RETENTION_1D)"
    influx bucket create \
        --name "$BUCKET_1D" \
        --org "$INFLUXDB_ORG" \
        --retention "$RETENTION_1D" \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" 2>/dev/null || log_warn "Bucket $BUCKET_1D might already exist"
    
    log_info "Bucket creation completed"
}

# Create downsampling task for 1-minute aggregates
create_1m_downsampling_task() {
    log_info "Creating 1-minute downsampling task..."
    
    TASK_SCRIPT=$(cat <<'EOF'
option task = {name: "downsample_all_sensors_1m", every: 1m, offset: 10s}

from(bucket: "sensor_data")
  |> range(start: -2m)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1m", org: "neurobuildtech")
EOF
)
    
    echo "$TASK_SCRIPT" | influx task create \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG" 2>/dev/null || log_warn "1-minute task might already exist"
    
    log_info "1-minute downsampling task created"
}

# Create downsampling task for 1-hour aggregates
create_1h_downsampling_task() {
    log_info "Creating 1-hour downsampling task..."
    
    TASK_SCRIPT=$(cat <<'EOF'
option task = {name: "downsample_all_sensors_1h", every: 1h, offset: 5m}

from(bucket: "sensor_data_1m")
  |> range(start: -2h)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")
EOF
)
    
    echo "$TASK_SCRIPT" | influx task create \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG" 2>/dev/null || log_warn "1-hour task might already exist"
    
    log_info "1-hour downsampling task created"
}

# Create downsampling task for daily aggregates
create_1d_downsampling_task() {
    log_info "Creating daily downsampling task..."
    
    TASK_SCRIPT=$(cat <<'EOF'
option task = {name: "downsample_all_sensors_1d", every: 1d, offset: 10m}

from(bucket: "sensor_data_1h")
  |> range(start: -2d)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1d", org: "neurobuildtech")
EOF
)
    
    echo "$TASK_SCRIPT" | influx task create \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG" 2>/dev/null || log_warn "Daily task might already exist"
    
    log_info "Daily downsampling task created"
}

# Update raw data bucket retention
update_raw_retention() {
    log_info "Updating raw data bucket retention policy..."
    
    influx bucket update \
        --name "$RAW_DATA_BUCKET" \
        --retention "$RAW_DATA_RETENTION" \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG" 2>/dev/null || log_warn "Could not update raw data retention"
    
    log_info "Raw data retention updated to $RAW_DATA_RETENTION"
}

# List all tasks
list_tasks() {
    log_info "Listing all tasks..."
    influx task list \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG"
}

# List all buckets
list_buckets() {
    log_info "Listing all buckets..."
    influx bucket list \
        --host "http://${INFLUXDB_HOST}:${INFLUXDB_PORT}" \
        --token "$INFLUXDB_TOKEN" \
        --org "$INFLUXDB_ORG"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Setting up Retention Policies and Tasks"
    log_info "=========================================="
    
    check_influx_cli
    check_config
    create_buckets
    update_raw_retention
    create_1m_downsampling_task
    create_1h_downsampling_task
    create_1d_downsampling_task
    
    echo ""
    list_buckets
    echo ""
    list_tasks
    
    log_info "=========================================="
    log_info "Setup completed successfully!"
    log_info "=========================================="
    log_info "Retention policies:"
    log_info "  - Raw data: $RAW_DATA_RETENTION"
    log_info "  - 1-minute aggregates: $RETENTION_1M"
    log_info "  - 1-hour aggregates: $RETENTION_1H"
    log_info "  - Daily aggregates: $RETENTION_1D"
}

# Run main function
main
