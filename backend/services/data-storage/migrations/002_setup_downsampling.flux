// Migration 002: Setup Downsampling Tasks
// Description: Create tasks for automatic data aggregation and downsampling
// Date: 2025-10-16

// =============================================================================
// TASK 1: 1-Minute Downsampling for All Sensors
// =============================================================================
// This task runs every minute and aggregates raw data into 1-minute averages

option task = {
  name: "downsample_all_sensors_1m",
  every: 1m,
  offset: 10s
}

from(bucket: "sensor_data")
  |> range(start: -2m)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1m", org: "neurobuildtech")

// =============================================================================
// TASK 2: 1-Hour Downsampling from 1-Minute Data
// =============================================================================
// This task runs every hour and creates hourly aggregates

option task = {
  name: "downsample_all_sensors_1h",
  every: 1h,
  offset: 5m
}

from(bucket: "sensor_data_1m")
  |> range(start: -2h)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")

// =============================================================================
// TASK 3: Daily Downsampling from 1-Hour Data
// =============================================================================
// This task runs daily and creates daily aggregates

option task = {
  name: "downsample_all_sensors_1d",
  every: 1d,
  offset: 10m
}

from(bucket: "sensor_data_1h")
  |> range(start: -2d)
  |> filter(fn: (r) => 
      r["_measurement"] == "ld2410_presence" or 
      r["_measurement"] == "pir_motion" or 
      r["_measurement"] == "mq134_gas"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> to(bucket: "sensor_data_1d", org: "neurobuildtech")

// =============================================================================
// TASK 4: Motion Event Counter (PIR Sensors)
// =============================================================================
// Counts motion events per hour for each device

option task = {
  name: "count_motion_events_1h",
  every: 1h,
  offset: 15m
}

from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["device_id", "location", "zone"])
  |> count()
  |> set(key: "_measurement", value: "motion_event_counts")
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")

// =============================================================================
// TASK 5: Gas Sensor Peak Tracking
// =============================================================================
// Tracks peak gas concentrations per hour

option task = {
  name: "track_gas_peaks_1h",
  every: 1h,
  offset: 20m
}

from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["device_id", "location", "zone"])
  |> max()
  |> set(key: "_measurement", value: "gas_concentration_peaks")
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")

// =============================================================================
// TASK 6: Presence Occupancy Rate Calculator
// =============================================================================
// Calculates occupancy rate for each hour

option task = {
  name: "calculate_occupancy_rate_1h",
  every: 1h,
  offset: 25m
}

from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> group(columns: ["device_id", "location", "zone"])
  |> mean()
  |> map(fn: (r) => ({ r with _value: r._value * 100.0 }))
  |> set(key: "_measurement", value: "occupancy_rate")
  |> to(bucket: "sensor_data_1h", org: "neurobuildtech")

// =============================================================================
// DEPLOYMENT INSTRUCTIONS
// =============================================================================
// To deploy these tasks, use one of the following methods:

// Method 1: Using influx CLI
// Save each task to a separate file and run:
// influx task create --file task_name.flux --org neurobuildtech

// Method 2: Using the setup script
// Run: ./scripts/setup-retention-policies.sh

// Method 3: Via InfluxDB UI
// Navigate to Tasks → Create Task → Paste the task code

// =============================================================================
// VERIFICATION
// =============================================================================
// List all tasks:
// influx task list --org neurobuildtech

// Check task runs:
// influx task run list --task-id <task_id>

// Monitor task execution:
// from(bucket: "_tasks")
//   |> range(start: -1h)
//   |> filter(fn: (r) => r["_measurement"] == "runs")

// =============================================================================
// ROLLBACK INSTRUCTIONS
// =============================================================================
// To remove a task:
// influx task delete --id <task_id>

// To disable a task without deleting:
// influx task update --id <task_id> --status inactive
