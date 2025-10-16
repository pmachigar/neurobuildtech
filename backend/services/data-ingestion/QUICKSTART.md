# Quick Start Guide

Get the data ingestion service running in under 5 minutes.

## Option 1: Docker Compose (Recommended)

This is the fastest way to get started with all dependencies included.

```bash
# Navigate to the service directory
cd backend/services/data-ingestion

# Start all services (MQTT broker, Redis, Data Ingestion)
docker-compose up -d

# View logs
docker-compose logs -f data-ingestion

# Test the service
curl http://localhost:3000/health
```

The service will be available at:
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:3001
- Metrics: http://localhost:9090/metrics
- MQTT Broker: mqtt://localhost:1883

## Option 2: Local Development

For development without Docker.

### Prerequisites

Install these tools:
- Node.js 20+
- Redis
- Mosquitto MQTT broker

### Start Dependencies

```bash
# Start Redis
redis-server

# Start Mosquitto (in another terminal)
mosquitto -c mosquitto/config/mosquitto.conf
```

### Start the Service

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev
```

## Testing the Service

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-16T18:33:58.123Z",
  "services": {
    "mqtt": "up",
    "redis": "up"
  }
}
```

### 2. Submit Sensor Data via HTTP

```bash
curl -X POST http://localhost:3000/api/v1/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32-001",
    "timestamp": "2025-10-16T18:33:58Z",
    "sensors": {
      "pir": {
        "motion_detected": true
      }
    }
  }'
```

Expected response:
```json
{
  "message": "Sensor data accepted",
  "message_id": "uuid-here",
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

### 3. Submit Sensor Data via MQTT

```bash
# Publish to MQTT
mosquitto_pub -h localhost -t "neurobuild/sensors/esp32-001/data" -m '{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "ld2410": {
      "presence": true,
      "distance": 150,
      "energy": 75
    }
  }
}'

# Subscribe to see the data
mosquitto_sub -h localhost -t "neurobuild/sensors/#" -v
```

### 4. Connect via WebSocket

Using `wscat` (install with `npm install -g wscat`):

```bash
# Connect to WebSocket server
wscat -c ws://localhost:3001

# Once connected, send a subscription message
> {"type": "subscribe"}

# You'll receive sensor data in real-time
< {"type":"sensor-data","data":{...},"timestamp":"2025-10-16T18:33:58.123Z"}
```

### 5. View Metrics

```bash
curl http://localhost:9090/metrics
```

## Common Development Tasks

### Run Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
```

### Run Linter

```bash
npm run lint
```

### View Logs

```bash
# Docker
docker-compose logs -f data-ingestion

# Local
# Logs are printed to console in development mode
```

### Stop Services

```bash
# Docker
docker-compose down

# Local
# Press Ctrl+C in each terminal
```

## Example: ESP32 Client

Here's a minimal ESP32 example to send data:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "192.168.1.100"; // Your server IP
const char* device_id = "esp32-001";

WiFiClient espClient;
PubSubClient client(espClient);

void publishSensorData() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = device_id;
  doc["timestamp"] = "2025-10-16T18:33:58Z";
  
  JsonObject sensors = doc.createNestedObject("sensors");
  JsonObject pir = sensors.createNestedObject("pir");
  pir["motion_detected"] = digitalRead(PIR_PIN);
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  char topic[100];
  snprintf(topic, sizeof(topic), "neurobuild/sensors/%s/data", device_id);
  client.publish(topic, buffer);
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  publishSensorData();
  delay(5000);
}
```

## Troubleshooting

### Service Won't Start

**Issue**: Port already in use

```bash
# Check what's using the port
lsof -i :3000

# Kill the process or change the port in .env
```

**Issue**: Can't connect to Redis

```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG

# If not running
redis-server
```

**Issue**: Can't connect to MQTT broker

```bash
# Test MQTT connection
mosquitto_sub -h localhost -t "test" -v

# If fails, start Mosquitto
mosquitto -c mosquitto/config/mosquitto.conf
```

### Data Not Being Received

**Check logs for validation errors:**

```bash
docker-compose logs data-ingestion | grep -i error
```

**Common issues:**
- Invalid timestamp format (must be ISO 8601)
- Missing required fields
- Invalid sensor values (check ranges)

### Performance Issues

**Check queue size:**

```bash
curl http://localhost:3000/api/v1/queue/status
```

If queue is growing, check:
- Redis connection
- Downstream service availability
- System resources

## Next Steps

1. **Configure for Production**
   - Update `.env` with production values
   - Enable TLS/SSL for MQTT
   - Set up authentication
   - Configure monitoring alerts

2. **Integrate with Storage**
   - Connect to database for persistence
   - Set up data retention policies
   - Configure backup procedures

3. **Scale the Service**
   - Deploy multiple instances behind load balancer
   - Use Redis Cluster for high availability
   - Set up horizontal pod autoscaling (Kubernetes)

4. **Monitor and Alert**
   - Set up Prometheus + Grafana
   - Configure alerting rules
   - Set up log aggregation

## Resources

- [Full Documentation](./README.md)
- [API Reference](./docs/API.md)
- [MQTT Guide](./docs/MQTT.md)
- [GitHub Issues](https://github.com/pmachigar/neurobuildtech/issues)

## Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify all dependencies are running
3. Test with the provided examples
4. Review the documentation
5. Open an issue on GitHub

Happy coding! 🚀
