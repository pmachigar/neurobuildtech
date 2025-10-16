// MQ134 Gas Sensor - Example Flux Queries
// InfluxDB 2.x Flux Language Query Examples

// ============================================================================
// 1. BASIC QUERIES
// ============================================================================

// Get last 1 hour of gas readings for a specific device
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["device_id"] == "mq134-001")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")

// Get current gas levels for all devices in a location
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["location"] == "kitchen")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> last()

// ============================================================================
// 2. CONCENTRATION ANALYSIS
// ============================================================================

// Average gas concentration over time (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["device_id"] == "mq134-001")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// Peak concentration levels (last 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["device_id"])
  |> max()

// Min, Max, Mean concentration statistics
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["device_id"] == "mq134-001")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group()
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// ============================================================================
// 3. ALARM AND THRESHOLD MONITORING
// ============================================================================

// Detect all alarm events (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "alarm_triggered")
  |> filter(fn: (r) => r["_value"] == true)

// Count alarms by severity level (last 7 days)
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "alarm_level")
  |> filter(fn: (r) => r["_value"] == "warning" or r["_value"] == "danger")
  |> group(columns: ["alarm_level", "location"])
  |> count()

// Find concentration spikes above threshold
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> filter(fn: (r) => r["_value"] > 50.0)  // Threshold in ppm

// Current devices in alarm state
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "alarm_triggered")
  |> last()
  |> filter(fn: (r) => r["_value"] == true)

// ============================================================================
// 4. GAS TYPE ANALYSIS
// ============================================================================

// Distribution of detected gas types (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "gas_type")
  |> group(columns: ["gas_type"])
  |> count()

// Track specific gas type concentrations
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm" or r["_field"] == "gas_type")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> filter(fn: (r) => r.gas_type == "NH3")

// ============================================================================
// 5. SENSOR RAW DATA ANALYSIS
// ============================================================================

// Monitor raw sensor values and voltage (last 1 hour)
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["device_id"] == "mq134-001")
  |> filter(fn: (r) => r["_field"] == "raw_value" or r["_field"] == "voltage")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")

// Sensor resistance trends (for calibration analysis)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "resistance_kohm")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)

// ============================================================================
// 6. ENVIRONMENTAL CORRELATION
// ============================================================================

// Correlate gas levels with temperature and humidity
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["device_id"] == "mq134-001")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm" or 
                       r["_field"] == "temperature_c" or 
                       r["_field"] == "humidity_percent")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")

// Average readings by temperature range
from(bucket: "sensor_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm" or r["_field"] == "temperature_c")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({ r with temp_range: 
    if r.temperature_c < 20.0 then "cold"
    else if r.temperature_c < 25.0 then "moderate"
    else "warm"
  }))
  |> group(columns: ["temp_range"])
  |> mean(column: "concentration_ppm")

// ============================================================================
// 7. LOCATION-BASED QUERIES
// ============================================================================

// Compare gas levels across different locations
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["location"])
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["location"], valueColumn: "_value")

// Identify locations with highest average concentration
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["location", "zone"])
  |> mean()
  |> sort(columns: ["_value"], desc: true)

// ============================================================================
// 8. CALIBRATION MONITORING
// ============================================================================

// Monitor sensors by calibration status
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["calibration"])
  |> last()

// Identify uncalibrated sensors
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["calibration"] == "uncalibrated" or r["calibration"] == "expired")
  |> last()
  |> pivot(rowKey:["device_id"], columnKey: ["_field"], valueColumn: "_value")

// ============================================================================
// 9. DEVICE HEALTH MONITORING
// ============================================================================

// Check battery levels for all devices
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "battery_level")
  |> last()
  |> filter(fn: (r) => r["_value"] < 20.0)

// Monitor signal strength (RSSI)
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "rssi")
  |> group(columns: ["device_id"])
  |> mean()
  |> sort(columns: ["_value"])

// ============================================================================
// 10. SAFETY AND COMPLIANCE QUERIES
// ============================================================================

// Calculate exposure time above safety threshold (last 24 hours)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> filter(fn: (r) => r["_value"] > 25.0)  // Safety threshold
  |> count()

// Time-weighted average (TWA) concentration (8-hour window)
from(bucket: "sensor_data")
  |> range(start: -8h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["device_id"])
  |> mean()

// ============================================================================
// 11. DOWNSAMPLING TASKS
// ============================================================================

// Task to create 1-minute averages
option task = {name: "downsample_mq134_1m", every: 1m}

from(bucket: "sensor_data")
  |> range(start: -2m)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1m", org: "neurobuildtech")

// Task to create hourly statistics
option task = {name: "downsample_mq134_1h", every: 1h}

from(bucket: "sensor_data")
  |> range(start: -2h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")

// Task to track peak concentrations
option task = {name: "track_mq134_peaks", every: 1h}

from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["device_id", "location"])
  |> max()
  |> to(bucket: "sensor_data_peaks", org: "neurobuildtech")
