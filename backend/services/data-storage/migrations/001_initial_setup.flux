// Migration 001: Initial Setup
// Description: Initial database setup with buckets and basic configurations
// Date: 2025-10-16

// This migration file documents the initial setup steps
// Execute these commands manually or use the setup scripts

// =============================================================================
// 1. CREATE MAIN SENSOR DATA BUCKET
// =============================================================================
// Command (CLI):
// influx bucket create --name sensor_data --org neurobuildtech --retention 30d

// =============================================================================
// 2. CREATE AGGREGATION BUCKETS
// =============================================================================
// Command (CLI):
// influx bucket create --name sensor_data_1m --org neurobuildtech --retention 90d
// influx bucket create --name sensor_data_1h --org neurobuildtech --retention 365d
// influx bucket create --name sensor_data_1d --org neurobuildtech --retention 1825d

// =============================================================================
// 3. CREATE ORGANIZATIONAL METADATA BUCKET (Optional)
// =============================================================================
// Command (CLI):
// influx bucket create --name device_metadata --org neurobuildtech --retention 0

// Device metadata schema example
// measurement: device_info
// tags: device_id, device_type
// fields: name, location, zone, firmware_version, last_seen, status

// =============================================================================
// 4. SETUP BASIC INDEXES (Automatic in InfluxDB 2.x)
// =============================================================================
// Tags are automatically indexed in InfluxDB 2.x
// Primary indexes: device_id, location, zone, sensor_type

// =============================================================================
// 5. CREATE SYSTEM MONITORING BUCKET (Optional)
// =============================================================================
// Command (CLI):
// influx bucket create --name _monitoring --org neurobuildtech --retention 7d

// For monitoring InfluxDB itself, task runs, and system health

// =============================================================================
// VERIFICATION QUERIES
// =============================================================================

// List all buckets
// influx bucket list --org neurobuildtech

// Verify bucket retention policies
// from(bucket: "_monitoring")
//   |> range(start: -1h)
//   |> filter(fn: (r) => r["_measurement"] == "buckets")
//   |> last()

// =============================================================================
// ROLLBACK INSTRUCTIONS
// =============================================================================
// To rollback this migration:
// influx bucket delete --name sensor_data --org neurobuildtech
// influx bucket delete --name sensor_data_1m --org neurobuildtech
// influx bucket delete --name sensor_data_1h --org neurobuildtech
// influx bucket delete --name sensor_data_1d --org neurobuildtech
// influx bucket delete --name device_metadata --org neurobuildtech
// influx bucket delete --name _monitoring --org neurobuildtech

// WARNING: This will delete all data in these buckets!
