# Performance Tuning Guide

## Overview

This guide provides best practices and optimization strategies for maximizing InfluxDB performance in the sensor data storage system.

## Table of Contents

1. [Write Performance](#write-performance)
2. [Query Performance](#query-performance)
3. [Resource Allocation](#resource-allocation)
4. [Schema Design](#schema-design)
5. [Cardinality Management](#cardinality-management)
6. [Hardware Recommendations](#hardware-recommendations)
7. [Monitoring Performance](#monitoring-performance)

## Write Performance

### Batch Writing

**Problem**: Writing one point at a time is inefficient.

**Solution**: Batch multiple points in a single write request.

**Python Example**:
```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(url="http://localhost:8086", token="token", org="org")
write_api = client.write_api(write_options=SYNCHRONOUS)

# Bad: One at a time
for i in range(1000):
    point = Point("measurement").field("value", i)
    write_api.write(bucket="bucket", record=point)

# Good: Batch writing
points = []
for i in range(1000):
    points.append(Point("measurement").field("value", i))
write_api.write(bucket="bucket", record=points)
```

**Recommended Batch Sizes**:
- Small points (< 100 bytes): 5,000 - 10,000 points
- Medium points (100-500 bytes): 1,000 - 5,000 points
- Large points (> 500 bytes): 500 - 1,000 points

### Asynchronous Writing

**Use async writes for better throughput**:

```python
from influxdb_client.client.write_api import ASYNCHRONOUS

write_api = client.write_api(write_options=ASYNCHRONOUS)

# Non-blocking writes
for batch in point_batches:
    write_api.write(bucket="sensor_data", record=batch)

# Close to ensure all writes complete
write_api.close()
```

**Configure write options**:
```python
from influxdb_client.client.write_api import WriteOptions

write_options = WriteOptions(
    batch_size=5000,
    flush_interval=10_000,  # 10 seconds
    jitter_interval=2_000,   # 2 seconds
    retry_interval=5_000,    # 5 seconds
    max_retries=3,
    max_retry_delay=30_000,
    exponential_base=2
)

write_api = client.write_api(write_options=write_options)
```

### Line Protocol Optimization

**Minimize whitespace and optimize field ordering**:

```
# Less efficient (more bytes)
measurement,tag1=value1,tag2=value2 field1=1.0,field2=2.0,field3=3.0 1697472000000000000

# More efficient (tag values as short as possible)
measurement,t1=v1,t2=v2 f1=1,f2=2,f3=3 1697472000000000000
```

**Pre-format timestamps**:
```python
import time

# Bad: String formatting every time
timestamp = f"{int(time.time() * 1e9)}"

# Good: Integer timestamp
timestamp = int(time.time() * 1e9)
```

### Connection Pooling

**Configure connection pool for high-throughput scenarios**:

```python
client = InfluxDBClient(
    url="http://localhost:8086",
    token="token",
    org="org",
    connection_pool_maxsize=25,  # Increase for high concurrency
    timeout=30_000  # 30 seconds
)
```

### Write Performance Metrics

**Target Metrics**:
- Write throughput: 10,000+ points/second (single instance)
- Write latency: < 100ms (p99)
- Success rate: > 99.9%

## Query Performance

### Use Time Ranges

**Always specify time ranges**:

```flux
# Bad: No time range (scans entire dataset)
from(bucket: "sensor_data")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")

# Good: Specific time range
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
```

### Filter Early and Often

**Apply filters as early as possible**:

```flux
# Bad: Late filtering (processes more data)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> aggregateWindow(every: 1h, fn: mean)
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")

# Good: Early filtering (processes less data)
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> aggregateWindow(every: 1h, fn: mean)
```

### Use Appropriate Buckets

**Query aggregated buckets for historical data**:

```flux
# Bad: Query raw data for weekly trends
from(bucket: "sensor_data")  # 30 days retention, high resolution
  |> range(start: -7d)
  |> aggregateWindow(every: 1h, fn: mean)

# Good: Query pre-aggregated hourly data
from(bucket: "sensor_data_1h")  # Already aggregated
  |> range(start: -7d)
```

**Bucket Selection Guide**:
- Real-time (last hour): Use `sensor_data`
- Recent trends (last day): Use `sensor_data_1m`
- Weekly/monthly analysis: Use `sensor_data_1h`
- Long-term trends: Use `sensor_data_1d`

### Limit Result Sets

**Always limit results when possible**:

```flux
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> limit(n: 1000)  // Prevent memory issues
```

### Avoid Expensive Operations

**Operations to use sparingly**:

```flux
// Expensive: Multiple passes over data
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["device_id"] == "device-001")
  |> sort(columns: ["_time"])  // Expensive
  |> unique(column: "_value")  // Expensive
  |> difference()  // Expensive

// Better: Aggregate and simplify
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["device_id"] == "device-001")
  |> aggregateWindow(every: 5m, fn: mean)
```

### Query Performance Metrics

**Target Metrics**:
- Query latency (1h range): < 500ms
- Query latency (24h range): < 2s
- Query latency (7d range with aggregation): < 5s

## Resource Allocation

### Memory Configuration

**Docker memory limits**:

```yaml
# docker-compose.yml
services:
  influxdb:
    deploy:
      resources:
        limits:
          memory: 8G  # Adjust based on workload
        reservations:
          memory: 4G
```

**InfluxDB cache settings**:

```yaml
environment:
  - INFLUXD_STORAGE_CACHE_MAX_MEMORY_SIZE=2147483648  # 2GB
  - INFLUXD_STORAGE_CACHE_SNAPSHOT_MEMORY_SIZE=26214400  # 25MB
```

**Memory sizing guidelines**:
- Minimum: 2GB
- Small deployment (< 100 devices): 4GB
- Medium deployment (100-1000 devices): 8GB
- Large deployment (> 1000 devices): 16GB+

### CPU Allocation

```yaml
services:
  influxdb:
    deploy:
      resources:
        limits:
          cpus: '4'  # Scale based on workload
        reservations:
          cpus: '2'
```

**CPU sizing guidelines**:
- Minimum: 2 cores
- Small deployment: 2-4 cores
- Medium deployment: 4-8 cores
- Large deployment: 8+ cores

### Storage Performance

**Use SSDs for optimal performance**:

```yaml
volumes:
  influxdb-data:
    driver: local
    driver_opts:
      type: none
      device: /mnt/ssd/influxdb  # SSD mount point
      o: bind
```

**Storage sizing guidelines**:
- Raw data: ~1KB per point
- Compressed data: ~250 bytes per point
- Buffer for growth: 2-3x expected size

**IOPS requirements**:
- Light workload: 1,000 IOPS
- Medium workload: 5,000 IOPS
- Heavy workload: 10,000+ IOPS

## Schema Design

### Tag vs Field Selection

**Tags** (indexed, limited cardinality):
```
device_id=ld2410-001        ✓ Good
location=room-101           ✓ Good
firmware_ver=v1.2.3         ✓ Good
timestamp=1697472000        ✗ Bad (use as time, not tag)
user_id=uuid-123-456        ✗ Bad (high cardinality)
```

**Fields** (not indexed, unlimited cardinality):
```
presence_detected=true      ✓ Good
distance_cm=125.5          ✓ Good
battery_level=87.5         ✓ Good
device_id=ld2410-001       ✗ Bad (should be tag)
```

### Measurement Design

**One measurement per sensor type**:

```
# Good: Separate measurements
ld2410_presence
pir_motion
mq134_gas

# Bad: Generic measurement with type tag
sensor_data,sensor_type=ld2410
sensor_data,sensor_type=pir
sensor_data,sensor_type=mq134
```

### Field Naming

**Use consistent, descriptive names**:

```
# Good
distance_cm
temperature_c
humidity_percent

# Bad
d          // Too short
DistanceCM // Inconsistent capitalization
dist_centimeters  // Inconsistent units
```

## Cardinality Management

### Understanding Cardinality

**Series cardinality** = unique combinations of measurement + tag set

```
Example:
measurement: ld2410_presence
tags: device_id (100 devices), location (10 locations)
cardinality = 1 * 100 * 10 = 1,000 series
```

### Cardinality Limits

**Recommended limits**:
- Per measurement: < 1,000,000 series
- Total database: < 10,000,000 series
- Tag values per tag key: < 100,000

### Check Cardinality

```flux
import "influxdata/influxdb/schema"

// Check measurement cardinality
schema.measurementCardinality(
  bucket: "sensor_data",
  start: -30d
)

// Check tag cardinality
schema.measurementTagKeys(
  bucket: "sensor_data",
  measurement: "ld2410_presence"
)
  |> count()
```

### Reduce Cardinality

**Strategies**:

1. **Use fields instead of tags for high-cardinality data**:
```
# Bad
tag: user_id=uuid-123-456-789  // Millions of unique users

# Good
field: user_id="uuid-123-456-789"  // Store as field
tag: user_group=premium            // Group as tag
```

2. **Limit tag values**:
```
# Bad
tag: firmware_ver=v1.2.3.4.5.6.7.8.9  // Very specific

# Good
tag: firmware_ver=v1.2  // Major.minor only
```

3. **Use time-based retention**:
```bash
# Old data with high cardinality is automatically removed
influx bucket update --name sensor_data --retention 30d
```

## Hardware Recommendations

### Small Deployment (< 100 devices)

**Specifications**:
- CPU: 2-4 cores
- RAM: 4-8 GB
- Storage: 100 GB SSD
- Network: 100 Mbps

**Expected Performance**:
- Write: 10,000 points/second
- Query: < 1s for 24h range

### Medium Deployment (100-1000 devices)

**Specifications**:
- CPU: 4-8 cores
- RAM: 8-16 GB
- Storage: 500 GB SSD
- Network: 1 Gbps

**Expected Performance**:
- Write: 50,000 points/second
- Query: < 2s for 7d range

### Large Deployment (> 1000 devices)

**Specifications**:
- CPU: 8-16 cores
- RAM: 16-32 GB
- Storage: 1 TB+ NVMe SSD
- Network: 10 Gbps

**Expected Performance**:
- Write: 100,000+ points/second
- Query: < 5s for 30d range

### Cloud Recommendations

**AWS**:
- EC2: m5.xlarge or c5.2xlarge
- Storage: gp3 SSD (3000+ IOPS)
- Network: Enhanced networking enabled

**Azure**:
- VM: Standard_D4s_v3
- Storage: Premium SSD
- Network: Accelerated networking

**GCP**:
- Compute: n2-standard-4
- Storage: SSD persistent disk
- Network: 10 Gbps tier

## Monitoring Performance

### Key Metrics to Monitor

**Write Metrics**:
```flux
from(bucket: "_monitoring")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_api_requests")
  |> filter(fn: (r) => r["endpoint"] == "/api/v2/write")
  |> group(columns: ["status"])
  |> count()
```

**Query Metrics**:
```flux
from(bucket: "_monitoring")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "query_duration")
  |> aggregateWindow(every: 5m, fn: mean)
```

**System Metrics**:
```bash
# Memory usage
docker stats neurobuild-influxdb --no-stream --format "{{.MemUsage}}"

# CPU usage
docker stats neurobuild-influxdb --no-stream --format "{{.CPUPerc}}"

# Disk usage
df -h /var/lib/influxdb2
```

### Performance Alerts

**Set up alerts for**:
- Write errors > 1%
- Query latency > 5s (p95)
- Memory usage > 80%
- CPU usage > 80%
- Disk usage > 85%
- Cardinality > 80% of limit

### Benchmarking

**Write benchmark**:
```bash
# Using influx-stress (InfluxDB testing tool)
influx-stress insert \
  --host http://localhost:8086 \
  --token $INFLUXDB_TOKEN \
  --bucket sensor_data \
  --points 1000000 \
  --workers 10
```

**Query benchmark**:
```bash
# Time a query
time influx query "
from(bucket: \"sensor_data\")
  |> range(start: -24h)
  |> filter(fn: (r) => r[\"_measurement\"] == \"ld2410_presence\")
  |> mean()
"
```

## Optimization Checklist

### Initial Setup
- [ ] Allocate sufficient resources (CPU, RAM, Storage)
- [ ] Use SSD for storage
- [ ] Configure appropriate retention policies
- [ ] Set up downsampling tasks
- [ ] Enable connection pooling

### Schema Design
- [ ] Use tags for indexed, low-cardinality data
- [ ] Use fields for high-cardinality data
- [ ] Keep tag values short
- [ ] Use consistent naming conventions
- [ ] Limit number of tags per measurement

### Write Optimization
- [ ] Enable batch writing
- [ ] Use asynchronous writes
- [ ] Configure appropriate batch sizes
- [ ] Minimize line protocol size
- [ ] Handle write errors gracefully

### Query Optimization
- [ ] Always use time ranges
- [ ] Filter early in query pipeline
- [ ] Use appropriate buckets for data age
- [ ] Limit result sets
- [ ] Avoid expensive operations

### Monitoring
- [ ] Monitor write throughput
- [ ] Track query performance
- [ ] Watch cardinality growth
- [ ] Alert on resource usage
- [ ] Regular performance testing

## Troubleshooting Performance Issues

### High Write Latency

**Symptoms**: Slow write operations, timeouts

**Solutions**:
1. Increase batch size
2. Use asynchronous writes
3. Add more CPU/memory
4. Check network latency
5. Optimize line protocol format

### Slow Queries

**Symptoms**: Long query execution times

**Solutions**:
1. Add time range filters
2. Use pre-aggregated buckets
3. Reduce result set size
4. Check cardinality
5. Optimize Flux query logic

### High Memory Usage

**Symptoms**: Memory usage > 80%, OOM errors

**Solutions**:
1. Increase memory allocation
2. Reduce cache size
3. Optimize query patterns
4. Reduce retention periods
5. Check for memory leaks

### High Cardinality

**Symptoms**: Slow writes, high memory usage

**Solutions**:
1. Move high-cardinality data to fields
2. Reduce tag value uniqueness
3. Implement data cleanup
4. Review tag design
5. Consider data partitioning

## References

- [InfluxDB Performance Guide](https://docs.influxdata.com/influxdb/v2.7/write-data/best-practices/optimize-writes/)
- [Flux Performance Optimization](https://docs.influxdata.com/flux/v0.x/stdlib/universe/)
- [System Monitoring](https://docs.influxdata.com/influxdb/v2.7/monitor-alert/)

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-16
