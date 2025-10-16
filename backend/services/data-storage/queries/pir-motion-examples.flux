// PIR Motion Sensor - Example Flux Queries
// InfluxDB 2.x Flux Language Query Examples

// ============================================================================
// 1. BASIC QUERIES
// ============================================================================

// Get last 1 hour of motion events for a specific device
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["device_id"] == "pir-001")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["_value"] == true)

// Get all motion events in a specific location (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["location"] == "hallway-2")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["_value"] == true)

// ============================================================================
// 2. EVENT COUNTING AND FREQUENCY
// ============================================================================

// Count motion events per device (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["device_id"])
  |> count()

// Motion frequency by hour of day (last 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start")
  |> filter(fn: (r) => r["_value"] == true)
  |> aggregateWindow(every: 1h, fn: count, createEmpty: false)

// Count motion events per location (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["location"])
  |> count()

// ============================================================================
// 3. DURATION ANALYSIS
// ============================================================================

// Average motion event duration per device (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "event_duration_ms")
  |> filter(fn: (r) => r["_value"] > 0)
  |> group(columns: ["device_id"])
  |> mean()
  |> map(fn: (r) => ({ r with _value: r._value / 1000.0 }))  // Convert to seconds

// Find longest motion events (last 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "event_duration_ms")
  |> filter(fn: (r) => r["_value"] > 0)
  |> sort(columns: ["_value"], desc: true)
  |> limit(n: 10)

// ============================================================================
// 4. TRIGGER PATTERN ANALYSIS
// ============================================================================

// Average trigger count per time window (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "trigger_count")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// Identify high-activity zones (trigger count > threshold)
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "trigger_count")
  |> group(columns: ["zone"])
  |> sum()
  |> filter(fn: (r) => r["_value"] > 100)

// ============================================================================
// 5. OCCUPANCY DETECTION
// ============================================================================

// Calculate occupancy rate by location (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> group(columns: ["location"])
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({ r with _value: r._value * 100.0 }))  // Convert to percentage

// Detect continuous occupancy (motion for > 1 hour)
from(bucket: "sensor_data")
  |> range(start: -2h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["device_id"] == "pir-001")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> filter(fn: (r) => r["_value"] > 0.8)  // 80% occupancy

// ============================================================================
// 6. COMPARATIVE ANALYSIS
// ============================================================================

// Compare motion activity between different zones
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> group(columns: ["zone"])
  |> aggregateWindow(every: 1h, fn: count, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["zone"], valueColumn: "_value")

// Compare sensor types performance
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["sensor_type"])
  |> count()

// ============================================================================
// 7. REAL-TIME MONITORING
// ============================================================================

// Get current motion status for all devices
from(bucket: "sensor_data")
  |> range(start: -1m)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> last()

// Detect ongoing motion events (motion_start but no motion_end)
from(bucket: "sensor_data")
  |> range(start: -10m)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start" or r["_field"] == "motion_end")
  |> last()
  |> pivot(rowKey:["device_id"], columnKey: ["_field"], valueColumn: "_value")
  |> filter(fn: (r) => r.motion_start == true and r.motion_end == false)

// ============================================================================
// 8. DEVICE HEALTH AND DIAGNOSTICS
// ============================================================================

// Check battery levels across all devices
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "battery_level")
  |> last()
  |> filter(fn: (r) => r["_value"] < 20.0)

// Monitor signal strength (RSSI)
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "rssi")
  |> group(columns: ["device_id"])
  |> mean()
  |> sort(columns: ["_value"])

// Check ambient temperature readings
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "ambient_temp_c")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// ============================================================================
// 9. PATTERN DETECTION
// ============================================================================

// Detect daily patterns (hourly motion count over 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start")
  |> filter(fn: (r) => r["_value"] == true)
  |> aggregateWindow(every: 1h, fn: count, createEmpty: false)
  |> group(columns: ["location"])

// Identify unusual activity (activity outside normal hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> filter(fn: (r) => r["_value"] == true)
  |> filter(fn: (r) => hour(v: r._time) < 6 or hour(v: r._time) > 22)

// ============================================================================
// 10. DOWNSAMPLING TASKS
// ============================================================================

// Task to create 1-minute motion event summaries
option task = {name: "downsample_pir_1m", every: 1m}

from(bucket: "sensor_data")
  |> range(start: -2m)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_detected")
  |> aggregateWindow(every: 1m, fn: count, createEmpty: false)
  |> to(bucket: "sensor_data_1m", org: "neurobuildtech")

// Task to create hourly motion statistics
option task = {name: "downsample_pir_1h", every: 1h}

from(bucket: "sensor_data")
  |> range(start: -2h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")
