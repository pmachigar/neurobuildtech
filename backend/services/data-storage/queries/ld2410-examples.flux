// LD2410 Presence Sensor - Example Flux Queries
// InfluxDB 2.x Flux Language Query Examples

// ============================================================================
// 1. BASIC QUERIES
// ============================================================================

// Get last 1 hour of presence data for a specific device
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")

// Get current presence status for all devices in a location
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["location"] == "room-101")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> last()

// ============================================================================
// 2. AGGREGATION QUERIES
// ============================================================================

// Calculate presence occupancy rate for last 24 hours (1-hour windows)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({ r with _value: r._value * 100.0 }))

// Average motion energy levels per location (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "motion_energy")
  |> group(columns: ["location"])
  |> mean()

// Count presence detection events per device (last 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["device_id"])
  |> count()

// ============================================================================
// 3. STATISTICAL QUERIES
// ============================================================================

// Min, Max, Mean distance measurements (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> filter(fn: (r) => r["_field"] == "distance_cm")
  |> filter(fn: (r) => r["_value"] > 0)
  |> group()
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// Calculate 95th percentile of motion energy
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "motion_energy")
  |> quantile(q: 0.95)

// ============================================================================
// 4. TIME-BASED QUERIES
// ============================================================================

// Get presence data for specific time window
from(bucket: "sensor_data")
  |> range(start: 2025-10-16T00:00:00Z, stop: 2025-10-16T23:59:59Z)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")

// Downsample to 5-minute averages
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> filter(fn: (r) => r["_field"] == "distance_cm" or r["_field"] == "motion_energy")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)

// ============================================================================
// 5. COMPLEX QUERIES
// ============================================================================

// Detect zones with high activity (presence > 50% of time in last hour)
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> group(columns: ["zone", "location"])
  |> mean()
  |> filter(fn: (r) => r["_value"] > 0.5)

// Compare presence patterns between different locations
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> group(columns: ["location"])
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["location"], valueColumn: "_value")

// ============================================================================
// 6. REAL-TIME MONITORING QUERIES
// ============================================================================

// Get latest readings from all devices (real-time dashboard)
from(bucket: "sensor_data")
  |> range(start: -1m)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> last()
  |> pivot(rowKey:["device_id"], columnKey: ["_field"], valueColumn: "_value")

// Detect devices with low battery (< 20%)
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "battery_level")
  |> last()
  |> filter(fn: (r) => r["_value"] < 20.0)

// ============================================================================
// 7. DEVICE HEALTH QUERIES
// ============================================================================

// Check signal strength across all devices
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "rssi")
  |> group(columns: ["device_id"])
  |> mean()
  |> sort(columns: ["_value"])

// Identify devices not reporting (no data in last 10 minutes)
// This requires a list of expected devices and comparison logic
// Typically done at application level or with tasks

// ============================================================================
// 8. CONTINUOUS QUERIES (Tasks for Downsampling)
// ============================================================================

// Task to downsample to 1-minute averages (save to aggregated bucket)
option task = {name: "downsample_ld2410_1m", every: 1m}

from(bucket: "sensor_data")
  |> range(start: -2m)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1m", org: "neurobuildtech")

// Task to downsample to 1-hour averages
option task = {name: "downsample_ld2410_1h", every: 1h}

from(bucket: "sensor_data")
  |> range(start: -2h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")
