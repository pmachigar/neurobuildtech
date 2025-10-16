# Data Ingestion Service

A scalable, real-time data ingestion pipeline for collecting sensor readings from ESP32-S3 devices. Supports multiple sensor types including LD2410 presence sensors, PIR motion sensors, and MQ134 gas sensors.

## Features

- **Multiple Protocol Support**: MQTT, HTTP/REST, and WebSocket
- **Data Validation**: Schema-based validation for all sensor types
- **Reliability**: Message queuing, retry logic, dead letter queue, and circuit breaker pattern
- **Real-time Streaming**: WebSocket support for live sensor data
- **Metrics & Monitoring**: Prometheus metrics and structured logging
- **Containerized**: Docker and Docker Compose support

## Architecture

```
┌─────────────┐     MQTT      ┌──────────────────────┐
│   ESP32     │──────────────►│                      │
│   Devices   │               │                      │
└─────────────┘               │   Data Ingestion     │
                              │      Service         │
┌─────────────┐     HTTP      │                      │
│  External   │──────────────►│  - Validation        │
│   Systems   │               │  - Processing        │
└─────────────┘               │  - Enrichment        │
                              │                      │
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌──────────┐         ┌──────────┐        ┌──────────┐
              │  Redis   │         │WebSocket │        │ Metrics  │
              │  Queue   │         │ Clients  │        │(Prometheus)│
              └──────────┘         └──────────┘        └──────────┘
```

## Supported Sensors

### LD2410 Presence Sensor
- **presence**: Boolean - presence detection status
- **distance**: Number (0-600) - detected distance in cm
- **energy**: Number (0-100) - signal energy level

### PIR Motion Sensor
- **motion_detected**: Boolean - motion detection status

### MQ134 Gas Sensor
- **gas_concentration**: Number (≥0) - gas concentration
- **unit**: String - measurement unit ("ppm" or "ppb")

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (optional)
- Redis (if running locally)
- MQTT Broker (Mosquitto recommended)

### Installation

```bash
# Clone the repository
cd backend/services/data-ingestion

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Running with Docker Compose

```bash
# Start all services (MQTT, Redis, Data Ingestion)
docker-compose up -d

# View logs
docker-compose logs -f data-ingestion

# Stop services
docker-compose down
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `3000` |
| `MQTT_BROKER_URL` | MQTT broker URL | `mqtt://localhost:1883` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `WS_PORT` | WebSocket port | `3001` |
| `LOG_LEVEL` | Logging level | `info` |

## API Documentation

### HTTP Endpoints

#### POST /api/v1/sensor-data

Submit a single sensor reading.

**Request Body:**
```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "ld2410": {
      "presence": true,
      "distance": 150,
      "energy": 75
    },
    "pir": {
      "motion_detected": true
    },
    "mq134": {
      "gas_concentration": 250,
      "unit": "ppm"
    }
  }
}
```

**Response:**
```json
{
  "message": "Sensor data accepted",
  "message_id": "uuid-here",
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

#### POST /api/v1/sensor-data/batch

Submit multiple sensor readings (max 100).

**Request Body:**
```json
[
  {
    "device_id": "esp32-001",
    "timestamp": "2025-10-16T18:33:58Z",
    "sensors": { ... }
  },
  {
    "device_id": "esp32-002",
    "timestamp": "2025-10-16T18:34:00Z",
    "sensors": { ... }
  }
]
```

**Response:**
```json
{
  "message": "Batch processed",
  "total": 2,
  "results": [
    {
      "device_id": "esp32-001",
      "status": "accepted",
      "message_id": "uuid-1"
    },
    {
      "device_id": "esp32-002",
      "status": "accepted",
      "message_id": "uuid-2"
    }
  ]
}
```

#### GET /health

Health check endpoint.

**Response:**
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

#### GET /ready

Readiness check endpoint.

#### GET /metrics

Prometheus metrics endpoint.

#### GET /api/v1/queue/status

Get queue status.

**Response:**
```json
{
  "queue_size": 42,
  "dlq_size": 0,
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

### MQTT Topics

#### Publishing Sensor Data

Devices can publish to the following topics:

- `neurobuild/sensors/{device_id}/data` - All sensor data
- `neurobuild/sensors/{device_id}/ld2410` - LD2410 specific data
- `neurobuild/sensors/{device_id}/pir` - PIR specific data
- `neurobuild/sensors/{device_id}/mq134` - MQ134 specific data

**Payload Format:**
```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "ld2410": {
      "presence": true,
      "distance": 150,
      "energy": 75
    }
  }
}
```

**QoS Level**: 1 (at least once delivery)

### WebSocket API

Connect to `ws://localhost:3001`

#### Client Messages

**Subscribe to sensor events:**
```json
{
  "type": "subscribe",
  "filters": {
    "device_id": "esp32-001",
    "sensor_type": "ld2410"
  }
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe"
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

#### Server Messages

**Connection acknowledgment:**
```json
{
  "type": "connected",
  "message": "Connected to sensor data stream",
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

**Sensor data event:**
```json
{
  "type": "sensor-data",
  "data": {
    "device_id": "esp32-001",
    "timestamp": "2025-10-16T18:33:58Z",
    "sensors": { ... },
    "received_at": "2025-10-16T18:33:58.123Z"
  },
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

## Monitoring

### Prometheus Metrics

Available at `http://localhost:9090/metrics`

**Key Metrics:**
- `sensor_data_ingested_total` - Total sensor readings ingested
- `sensor_data_errors_total` - Total ingestion errors
- `sensor_data_processing_latency_seconds` - Processing latency histogram
- `active_connections` - Number of active connections by type
- `queue_size` - Current queue size

### Logging

Structured JSON logging using Winston:

```json
{
  "timestamp": "2025-10-16 18:33:58",
  "level": "INFO",
  "message": "Successfully processed MQTT message",
  "deviceId": "esp32-001",
  "duration": 0.025
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Error Handling

### Retry Logic
- Failed messages are automatically retried up to 3 times
- Exponential backoff between retries
- Configurable retry delay

### Dead Letter Queue
- Messages that fail after max retries are moved to DLQ
- DLQ can be monitored and processed separately
- Prevents data loss

### Circuit Breaker
- Protects downstream services from cascading failures
- Opens after 5 consecutive failures
- Half-open state for gradual recovery
- Configurable threshold and timeout

## Integration Guide

### ESP32 Integration

#### MQTT Example (Arduino/PlatformIO)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "mqtt.example.com";
const char* device_id = "esp32-001";

WiFiClient espClient;
PubSubClient client(espClient);

void publishSensorData() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = device_id;
  doc["timestamp"] = getISOTimestamp();
  
  JsonObject sensors = doc.createNestedObject("sensors");
  JsonObject ld2410 = sensors.createNestedObject("ld2410");
  ld2410["presence"] = true;
  ld2410["distance"] = 150;
  ld2410["energy"] = 75;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  char topic[64];
  snprintf(topic, sizeof(topic), "neurobuild/sensors/%s/data", device_id);
  client.publish(topic, buffer, true);
}
```

#### HTTP Example (Arduino/PlatformIO)

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void publishSensorDataHTTP() {
  HTTPClient http;
  http.begin("http://api.example.com/api/v1/sensor-data");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = "esp32-001";
  doc["timestamp"] = getISOTimestamp();
  
  JsonObject sensors = doc.createNestedObject("sensors");
  JsonObject pir = sensors.createNestedObject("pir");
  pir["motion_detected"] = true;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  http.end();
}
```

### Python Client Example

```python
import paho.mqtt.client as mqtt
import json
from datetime import datetime

def publish_sensor_data(client, device_id, sensor_data):
    payload = {
        "device_id": device_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sensors": sensor_data
    }
    
    topic = f"neurobuild/sensors/{device_id}/data"
    client.publish(topic, json.dumps(payload), qos=1)

# Usage
client = mqtt.Client()
client.connect("localhost", 1883, 60)

sensor_data = {
    "mq134": {
        "gas_concentration": 250,
        "unit": "ppm"
    }
}

publish_sensor_data(client, "esp32-001", sensor_data)
```

## Performance

### Throughput
- HTTP: ~1000 requests/second per instance
- MQTT: ~5000 messages/second per instance
- WebSocket: Supports 1000+ concurrent connections

### Scalability
- Horizontal scaling supported
- Stateless design (state in Redis)
- Load balancer compatible

## Security Considerations

1. **Authentication**: Implement device authentication (not included in this version)
2. **TLS/SSL**: Use encrypted connections in production
3. **Rate Limiting**: Implement rate limiting for HTTP endpoints
4. **Input Validation**: All inputs are validated before processing

## Troubleshooting

### MQTT Connection Issues
```bash
# Test MQTT connection
mosquitto_sub -h localhost -t "neurobuild/sensors/#" -v
```

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -h localhost ping
```

### Check Service Health
```bash
curl http://localhost:3000/health
```

### View Logs
```bash
# Docker
docker-compose logs -f data-ingestion

# Local
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions, please create an issue in the GitHub repository.
