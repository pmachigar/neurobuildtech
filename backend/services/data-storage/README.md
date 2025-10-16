# Time-Series Sensor Data Storage

This directory contains the implementation of the backend storage solution for time-series sensor data using InfluxDB 2.x.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Database Schema](#database-schema)
5. [Data Retention](#data-retention)
6. [Query Examples](#query-examples)
7. [Backup and Restore](#backup-and-restore)
8. [Security](#security)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Performance Tuning](#performance-tuning)

## Overview

This system provides a scalable, high-performance time-series database solution for storing and querying IoT sensor data from:
- **LD2410 Presence Sensors** - Millimeter wave radar presence detection
- **PIR Motion Sensors** - Passive infrared motion detection
- **MQ134 Gas Sensors** - Multi-gas concentration monitoring

### Technology Stack

- **Database**: InfluxDB 2.7
- **Query Language**: Flux
- **Visualization**: Chronograf (optional)
- **Container Orchestration**: Docker Compose

### Key Features

- ✅ High write throughput (10,000+ writes/second)
- ✅ Efficient time-range queries
- ✅ Automatic data downsampling
- ✅ Configurable retention policies
- ✅ Built-in compression
- ✅ Horizontal scalability ready
- ✅ Encryption at rest
- ✅ Role-based access control

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Data Ingestion                       │
│                    (API / MQTT / Direct)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      InfluxDB 2.x                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Raw Data Bucket (30 days)                            │  │
│  │  - ld2410_presence                                    │  │
│  │  - pir_motion                                         │  │
│  │  - mq134_gas                                          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │ Downsampling Tasks                    │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1-Minute Aggregates (90 days)                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │ Downsampling Tasks                    │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1-Hour Aggregates (365 days)                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │ Downsampling Tasks                    │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Daily Aggregates (5 years)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API / Query Layer                        │
│              (Dashboards, Analytics, Alerts)                │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM recommended
- 50GB+ disk space for data storage

### Installation

1. **Clone the repository and navigate to the data-storage directory**:
   ```bash
   cd backend/services/data-storage
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

3. **Start InfluxDB**:
   ```bash
   docker-compose up -d
   ```

4. **Verify the installation**:
   ```bash
   docker-compose ps
   # Should show influxdb and chronograf running
   ```

5. **Access the InfluxDB UI**:
   - URL: http://localhost:8086
   - Login with credentials from .env file

6. **Setup retention policies and downsampling tasks**:
   ```bash
   ./scripts/setup-retention-policies.sh
   ```

### Quick Start - Writing Data

**Using InfluxDB Line Protocol**:
```bash
curl -XPOST "http://localhost:8086/api/v2/write?org=neurobuildtech&bucket=sensor_data" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary "ld2410_presence,device_id=ld2410-001,location=room-101 presence_detected=true,distance_cm=125.5 $(date +%s)000000000"
```

**Using Python (example)**:
```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(url="http://localhost:8086", 
                       token="YOUR_TOKEN", 
                       org="neurobuildtech")
write_api = client.write_api(write_options=SYNCHRONOUS)

point = Point("ld2410_presence") \
    .tag("device_id", "ld2410-001") \
    .tag("location", "room-101") \
    .field("presence_detected", True) \
    .field("distance_cm", 125.5)

write_api.write(bucket="sensor_data", record=point)
```

## Database Schema

### Supported Measurements

1. **ld2410_presence** - LD2410 presence sensor data
2. **pir_motion** - PIR motion sensor data
3. **mq134_gas** - MQ134 gas sensor data

### Common Tags (Indexed)

All measurements share these common tags:

| Tag          | Description                    | Example        |
|--------------|--------------------------------|----------------|
| device_id    | Unique device identifier       | "ld2410-001"   |
| location     | Physical location              | "room-101"     |
| zone         | Sub-location or area           | "entrance"     |
| firmware_ver | Firmware version               | "v1.2.3"       |

### Detailed Schemas

- [LD2410 Presence Sensor Schema](schemas/ld2410-presence-sensor.md)
- [PIR Motion Sensor Schema](schemas/pir-motion-sensor.md)
- [MQ134 Gas Sensor Schema](schemas/mq134-gas-sensor.md)

## Data Retention

### Retention Policy Configuration

| Bucket            | Data Type              | Retention Period | Purpose                          |
|-------------------|------------------------|------------------|----------------------------------|
| sensor_data       | Raw measurements       | 30 days          | Real-time queries, recent data   |
| sensor_data_1m    | 1-minute aggregates    | 90 days          | Short-term trends                |
| sensor_data_1h    | 1-hour aggregates      | 365 days (1 yr)  | Medium-term analytics            |
| sensor_data_1d    | Daily aggregates       | 1825 days (5 yr) | Long-term trends, historical     |

### Configuring Retention

Modify retention periods in `.env`:
```bash
RAW_DATA_RETENTION=30d
AGGREGATED_DATA_RETENTION_1M=90d
AGGREGATED_DATA_RETENTION_1H=365d
AGGREGATED_DATA_RETENTION_1D=1825d
```

Update retention policies:
```bash
./scripts/setup-retention-policies.sh
```

### Downsampling Tasks

Automatic downsampling tasks run continuously:
- **1-minute**: Runs every minute, aggregates last 2 minutes
- **1-hour**: Runs every hour, aggregates last 2 hours from 1m data
- **Daily**: Runs daily, aggregates last 2 days from 1h data

## Query Examples

### Basic Queries

**Get last hour of presence data**:
```flux
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
```

**Get current status of all devices**:
```flux
from(bucket: "sensor_data")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> last()
```

### Aggregation Queries

**Average gas concentration by location**:
```flux
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "mq134_gas")
  |> filter(fn: (r) => r["_field"] == "concentration_ppm")
  |> group(columns: ["location"])
  |> mean()
```

**Motion event count per device**:
```flux
from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "pir_motion")
  |> filter(fn: (r) => r["_field"] == "motion_start")
  |> filter(fn: (r) => r["_value"] == true)
  |> group(columns: ["device_id"])
  |> count()
```

### More Examples

- [LD2410 Query Examples](queries/ld2410-examples.flux)
- [PIR Motion Query Examples](queries/pir-motion-examples.flux)
- [MQ134 Gas Query Examples](queries/mq134-gas-examples.flux)

## Backup and Restore

### Automated Backups

Configure automated backups with cron:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/influxdb-backup.log 2>&1
```

### Manual Backup

```bash
# Set environment variables
export INFLUXDB_ADMIN_TOKEN="your-token"
export BACKUP_PATH="/path/to/backups"

# Run backup script
./scripts/backup.sh
```

Backup creates:
- Compressed archive: `influxdb_backup_YYYYMMDD_HHMMSS.tar.gz`
- Manifest file: `influxdb_backup_YYYYMMDD_HHMMSS.manifest`

### Restore from Backup

**List available backups**:
```bash
./scripts/restore.sh --list
```

**Restore from specific backup**:
```bash
export INFLUXDB_ADMIN_TOKEN="your-token"
./scripts/restore.sh --file /backups/influxdb_backup_20251016_120000.tar.gz
```

**⚠️ Warning**: Restore operations may overwrite existing data. Always confirm before proceeding.

### Backup Best Practices

1. **Test restores regularly** - Verify backups are working
2. **Store backups off-site** - Use cloud storage or remote servers
3. **Monitor backup jobs** - Set up alerts for failed backups
4. **Document procedures** - Keep restoration procedures updated
5. **Encrypt backups** - Use encryption for sensitive data

## Security

### Authentication and Authorization

**Role-Based Access Control (RBAC)**:

1. **Admin User**: Full access to all buckets and operations
2. **Write User**: Can write data to specific buckets
3. **Read User**: Can query data from specific buckets

**Create a read-only user**:
```bash
influx user create --name readonly_user --org neurobuildtech --password <password>
influx auth create --user readonly_user --read-bucket sensor_data --read-bucket sensor_data_1h
```

**Create a write-only user**:
```bash
influx user create --name writer_user --org neurobuildtech --password <password>
influx auth create --user writer_user --write-bucket sensor_data
```

### Encryption

**At Rest**:
- Configure volume encryption at the OS/storage level
- Use encrypted Docker volumes

**In Transit**:
- Enable HTTPS in docker-compose.yml
- Configure TLS certificates
- Update INFLUXDB_HTTP_HTTPS_ENABLED=true

**Connection String Security**:
```bash
# Store tokens in environment variables, never in code
export INFLUXDB_TOKEN=$(cat /secure/path/token.txt)

# Use secrets management (Docker Secrets, Vault, etc.)
docker secret create influxdb_token /path/to/token.txt
```

### Audit Logging

Enable query logging in docker-compose.yml:
```yaml
environment:
  - INFLUXDB_DATA_QUERY_LOG_ENABLED=true
```

Monitor logs:
```bash
docker-compose logs -f influxdb | grep QUERY
```

### Network Security

```yaml
# Restrict to internal network only
networks:
  neurobuild-network:
    internal: true
```

## Monitoring and Maintenance

### Health Checks

**Check InfluxDB status**:
```bash
docker-compose exec influxdb influx ping
```

**Monitor resource usage**:
```bash
docker stats neurobuild-influxdb
```

**Check bucket sizes**:
```bash
influx bucket list --org neurobuildtech
```

### Task Monitoring

**List all tasks**:
```bash
influx task list --org neurobuildtech
```

**Check task runs**:
```bash
influx task run list --task-id <task_id>
```

**Monitor failed tasks**:
```flux
from(bucket: "_tasks")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "runs")
  |> filter(fn: (r) => r["status"] == "failed")
```

### Maintenance Tasks

**Compact data (manual)**:
```bash
docker-compose exec influxdb influx server-config
```

**Clean up old data manually**:
```flux
// Delete data older than retention policy
from(bucket: "sensor_data")
  |> range(start: -60d, stop: -30d)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
  |> delete()
```

## Troubleshooting

### Common Issues

**1. Container won't start**:
```bash
# Check logs
docker-compose logs influxdb

# Common causes:
# - Port 8086 already in use
# - Insufficient permissions on volumes
# - Corrupted data directory
```

**2. Authentication failures**:
```bash
# Verify token
influx auth list --org neurobuildtech

# Regenerate token if needed
influx auth create --org neurobuildtech --all-access
```

**3. High memory usage**:
```bash
# Check memory limits
docker stats neurobuild-influxdb

# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G
```

**4. Slow queries**:
```flux
// Use explain to analyze query
option experimental.explain = true

from(bucket: "sensor_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
```

**5. Task failures**:
```bash
# Check task logs
influx task run list --task-id <task_id>

# Common causes:
# - Source bucket empty
# - Destination bucket doesn't exist
# - Insufficient permissions
```

### Debug Mode

Enable verbose logging:
```yaml
# docker-compose.yml
environment:
  - INFLUXDB_LOG_LEVEL=debug
```

## Performance Tuning

### Write Performance

**Batch Writes**:
```python
# Write multiple points at once
points = [point1, point2, point3, ...]
write_api.write(bucket="sensor_data", record=points)
```

**Asynchronous Writes**:
```python
from influxdb_client.client.write_api import ASYNCHRONOUS

write_api = client.write_api(write_options=ASYNCHRONOUS)
```

**Connection Pooling**:
```python
client = InfluxDBClient(
    url="http://localhost:8086",
    token="token",
    org="neurobuildtech",
    connection_pool_maxsize=25
)
```

### Query Performance

**Best Practices**:

1. **Always use time ranges**: Don't query without `range()`
2. **Filter early**: Apply filters before aggregations
3. **Use appropriate bucket**: Query aggregated buckets for historical data
4. **Limit result sets**: Use `limit()` for large datasets
5. **Push down predicates**: Filter on tags before fields

**Example - Optimized Query**:
```flux
// Good: Filters applied early, uses aggregated bucket
from(bucket: "sensor_data_1h")
  |> range(start: -7d)
  |> filter(fn: (r) => r["device_id"] == "ld2410-001")
  |> filter(fn: (r) => r["_field"] == "presence_detected")
  |> mean()

// Bad: No time range, filters not specific
from(bucket: "sensor_data")
  |> filter(fn: (r) => r["_measurement"] == "ld2410_presence")
```

### Resource Allocation

**Recommended Settings**:

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

**Storage**:
- Use SSDs for better I/O performance
- Separate volumes for data and config
- Monitor disk usage regularly

### Cardinality Management

**Avoid high cardinality in tags**:
```
# Bad: Using timestamps or UUIDs as tags
device_id=uuid-123-456-789

# Good: Using meaningful identifiers
device_id=ld2410-001
```

**Monitor cardinality**:
```flux
import "influxdata/influxdb/schema"

schema.measurementTagKeys(bucket: "sensor_data", measurement: "ld2410_presence")
  |> count()
```

## Additional Resources

### Documentation
- [InfluxDB 2.x Documentation](https://docs.influxdata.com/influxdb/v2.7/)
- [Flux Language Guide](https://docs.influxdata.com/flux/v0.x/)
- [InfluxDB Best Practices](https://docs.influxdata.com/influxdb/v2.7/write-data/best-practices/)

### Support
- Create an issue in the repository
- Check existing issues for solutions
- Review migration files for setup guidance

### Contributing
- Follow the schema documentation format
- Test queries before committing
- Update this README for significant changes
- Document all migration steps

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-16  
**Maintained By**: NeuroBuild Tech Team
