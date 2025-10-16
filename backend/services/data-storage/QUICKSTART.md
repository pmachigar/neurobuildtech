# Quick Start Guide

Get up and running with the time-series sensor data storage in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- 10GB disk space

## Step 1: Setup Environment

```bash
cd backend/services/data-storage

# Copy environment template
cp .env.example .env

# Edit with your credentials (IMPORTANT: Change default passwords!)
nano .env
```

**Required Changes in .env**:
```bash
INFLUXDB_ADMIN_PASSWORD=<your-strong-password>
INFLUXDB_ADMIN_TOKEN=<generate-random-token>
```

Generate a secure token:
```bash
openssl rand -hex 32
```

## Step 2: Start InfluxDB

```bash
# Start containers
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs
docker-compose logs -f influxdb
```

Expected output:
```
influxdb    | ts=... lvl=info msg="InfluxDB starting"
influxdb    | ts=... lvl=info msg="Listening" service=http addr=:8086
```

## Step 3: Verify Installation

Open your browser and navigate to: http://localhost:8086

Login with:
- Username: `admin` (or value from .env)
- Password: Your password from .env

## Step 4: Setup Retention Policies

```bash
# Set environment variables
export INFLUXDB_ADMIN_TOKEN="your-token-from-env"
export INFLUXDB_HOST=localhost
export INFLUXDB_PORT=8086
export INFLUXDB_ORG=neurobuildtech

# Run setup script
./scripts/setup-retention-policies.sh
```

This creates:
- ✅ Aggregation buckets (1m, 1h, 1d)
- ✅ Retention policies
- ✅ Downsampling tasks

## Step 5: Test Data Write

### Option A: Using CLI

```bash
# Install influx CLI (if not already installed)
# Linux: wget https://download.influxdata.com/influxdb/releases/influxdb2-client-2.7.3-linux-amd64.tar.gz
# macOS: brew install influxdb-cli

# Write test data
influx write \
  --bucket sensor_data \
  --org neurobuildtech \
  --token "your-token" \
  "ld2410_presence,device_id=test-001,location=lab presence_detected=true,distance_cm=125.5"
```

### Option B: Using curl

```bash
curl -XPOST "http://localhost:8086/api/v2/write?org=neurobuildtech&bucket=sensor_data" \
  -H "Authorization: Token your-token" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary "ld2410_presence,device_id=test-001,location=lab presence_detected=true,distance_cm=125.5"
```

### Option C: Using Python

```bash
# Install client library
pip install influxdb-client

# Run test script
python3 << EOF
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(
    url="http://localhost:8086",
    token="your-token",
    org="neurobuildtech"
)

write_api = client.write_api(write_options=SYNCHRONOUS)

point = Point("ld2410_presence") \
    .tag("device_id", "test-001") \
    .tag("location", "lab") \
    .field("presence_detected", True) \
    .field("distance_cm", 125.5)

write_api.write(bucket="sensor_data", record=point)
print("✅ Data written successfully!")
client.close()
EOF
```

## Step 6: Query Data

### Using InfluxDB UI

1. Go to http://localhost:8086
2. Click "Data Explorer" in left menu
3. Select bucket: `sensor_data`
4. Select measurement: `ld2410_presence`
5. Click "Submit"

### Using CLI

```bash
influx query --org neurobuildtech "
from(bucket: \"sensor_data\")
  |> range(start: -1h)
  |> filter(fn: (r) => r[\"_measurement\"] == \"ld2410_presence\")
  |> limit(n: 10)
"
```

### Using Chronograf (Optional)

Navigate to: http://localhost:8888

## Verification Checklist

- [ ] Docker containers running (`docker-compose ps`)
- [ ] InfluxDB UI accessible (http://localhost:8086)
- [ ] Can login with admin credentials
- [ ] Buckets created (sensor_data, sensor_data_1m, sensor_data_1h, sensor_data_1d)
- [ ] Tasks created and active
- [ ] Test data written successfully
- [ ] Test data queryable

## Common Issues

### Port 8086 already in use
```bash
# Check what's using the port
sudo lsof -i :8086

# Either stop that service or change port in docker-compose.yml
```

### Permission denied on scripts
```bash
chmod +x scripts/*.sh
```

### Cannot connect to InfluxDB
```bash
# Check container logs
docker-compose logs influxdb

# Restart containers
docker-compose restart
```

### Authentication failed
```bash
# Verify token
echo $INFLUXDB_ADMIN_TOKEN

# Check .env file
cat .env | grep TOKEN
```

## Next Steps

1. **Read the Documentation**: [README.md](README.md)
2. **Review Schemas**: [schemas/](schemas/)
3. **Try Query Examples**: [queries/](queries/)
4. **Setup Backups**: Configure automated backups
5. **Review Security**: [SECURITY.md](SECURITY.md)
6. **Optimize Performance**: [PERFORMANCE.md](PERFORMANCE.md)

## Quick Reference

### Important URLs
- InfluxDB UI: http://localhost:8086
- Chronograf: http://localhost:8888
- API Endpoint: http://localhost:8086/api/v2

### Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f influxdb

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Execute commands in container
docker-compose exec influxdb influx version

# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh --list
./scripts/restore.sh --file /path/to/backup.tar.gz
```

### Environment Variables

```bash
export INFLUXDB_HOST=localhost
export INFLUXDB_PORT=8086
export INFLUXDB_ADMIN_TOKEN="your-token"
export INFLUXDB_ORG=neurobuildtech
export INFLUXDB_BUCKET=sensor_data
```

## Support

- 📖 Full Documentation: [README.md](README.md)
- 🔒 Security Guide: [SECURITY.md](SECURITY.md)
- ⚡ Performance Guide: [PERFORMANCE.md](PERFORMANCE.md)
- 📊 Query Examples: [queries/](queries/)
- 🗂️ Schema Docs: [schemas/](schemas/)

## Example: Complete Workflow

```bash
# 1. Setup
cd backend/services/data-storage
cp .env.example .env
# Edit .env with your values

# 2. Start
docker-compose up -d

# 3. Configure
export INFLUXDB_ADMIN_TOKEN="your-token"
./scripts/setup-retention-policies.sh

# 4. Write data
curl -XPOST "http://localhost:8086/api/v2/write?org=neurobuildtech&bucket=sensor_data" \
  -H "Authorization: Token $INFLUXDB_ADMIN_TOKEN" \
  --data-binary "ld2410_presence,device_id=test-001 presence_detected=true"

# 5. Query data
influx query --org neurobuildtech "
from(bucket: \"sensor_data\")
  |> range(start: -1h)
  |> filter(fn: (r) => r[\"_measurement\"] == \"ld2410_presence\")
"

# 6. Monitor
docker-compose logs -f influxdb

# Success! 🎉
```

---

**Need Help?** Check the full [README.md](README.md) or open an issue.
