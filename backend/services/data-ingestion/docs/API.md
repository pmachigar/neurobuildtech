# API Documentation

## HTTP REST API

Base URL: `http://localhost:3000`

### Authentication

Currently, no authentication is required. For production use, implement API keys or JWT tokens.

### Content Type

All requests must use `Content-Type: application/json`

### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 202 | Accepted (async processing) |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Endpoints

### POST /api/v1/sensor-data

Submit a single sensor reading.

**Request:**

```http
POST /api/v1/sensor-data HTTP/1.1
Content-Type: application/json

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

**Response (202):**

```json
{
  "message": "Sensor data accepted",
  "message_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

**Error Response (400):**

```json
{
  "error": "Invalid sensor data",
  "details": "\"sensors.ld2410.distance\" must be less than or equal to 600"
}
```

**Error Response (409):**

```json
{
  "error": "Duplicate reading",
  "device_id": "esp32-001"
}
```

### POST /api/v1/sensor-data/batch

Submit multiple sensor readings in a single request (max 100).

**Request:**

```http
POST /api/v1/sensor-data/batch HTTP/1.1
Content-Type: application/json

[
  {
    "device_id": "esp32-001",
    "timestamp": "2025-10-16T18:33:58Z",
    "sensors": {
      "pir": {
        "motion_detected": true
      }
    }
  },
  {
    "device_id": "esp32-002",
    "timestamp": "2025-10-16T18:34:00Z",
    "sensors": {
      "mq134": {
        "gas_concentration": 300,
        "unit": "ppm"
      }
    }
  }
]
```

**Response (202):**

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

**Partial Success Response (202):**

```json
{
  "message": "Batch processed",
  "total": 3,
  "results": [
    {
      "device_id": "esp32-001",
      "status": "accepted",
      "message_id": "uuid-1"
    },
    {
      "device_id": "esp32-002",
      "status": "failed",
      "error": "\"timestamp\" is required"
    },
    {
      "device_id": "esp32-003",
      "status": "duplicate"
    }
  ]
}
```

### GET /health

Health check endpoint for load balancers and monitoring systems.

**Response (200):**

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

**Response (503):**

```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-16T18:33:58.123Z",
  "services": {
    "mqtt": "down",
    "redis": "up"
  }
}
```

### GET /ready

Kubernetes-style readiness probe.

**Response (200):**

```json
{
  "ready": true,
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

**Response (503):**

```json
{
  "ready": false,
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

### GET /metrics

Prometheus-compatible metrics endpoint.

**Response (200):**

```
# HELP sensor_data_ingested_total Total number of sensor readings ingested
# TYPE sensor_data_ingested_total counter
sensor_data_ingested_total{device_id="esp32-001",sensor_type="ld2410"} 1234

# HELP sensor_data_errors_total Total number of ingestion errors
# TYPE sensor_data_errors_total counter
sensor_data_errors_total{error_type="validation_error",device_id="esp32-001"} 5

# HELP sensor_data_processing_latency_seconds Latency of sensor data processing in seconds
# TYPE sensor_data_processing_latency_seconds histogram
sensor_data_processing_latency_seconds_bucket{operation="http_processing",le="0.005"} 850
sensor_data_processing_latency_seconds_bucket{operation="http_processing",le="0.01"} 900
sensor_data_processing_latency_seconds_bucket{operation="http_processing",le="+Inf"} 1000

# HELP active_connections Number of active connections
# TYPE active_connections gauge
active_connections{connection_type="mqtt"} 1
active_connections{connection_type="http"} 1
active_connections{connection_type="websocket"} 12

# HELP queue_size Current size of message queue
# TYPE queue_size gauge
queue_size{queue_name="sensor-data"} 42
queue_size{queue_name="sensor-data-dlq"} 0
```

### GET /api/v1/queue/status

Get current queue status.

**Response (200):**

```json
{
  "queue_size": 42,
  "dlq_size": 0,
  "timestamp": "2025-10-16T18:33:58.123Z"
}
```

## Data Models

### SensorReading

```typescript
interface SensorReading {
  device_id: string;           // Required: Device identifier
  timestamp: string;           // Required: ISO 8601 timestamp
  sensors: SensorData;         // Required: At least one sensor
}
```

### SensorData

```typescript
interface SensorData {
  ld2410?: LD2410Data;
  pir?: PIRData;
  mq134?: MQ134Data;
}
```

### LD2410Data

```typescript
interface LD2410Data {
  presence: boolean;           // Required: Presence detection
  distance: number;            // Required: 0-600 cm
  energy: number;              // Required: 0-100%
}
```

### PIRData

```typescript
interface PIRData {
  motion_detected: boolean;    // Required: Motion detection status
}
```

### MQ134Data

```typescript
interface MQ134Data {
  gas_concentration: number;   // Required: ≥0
  unit: string;                // Required: "ppm" or "ppb"
}
```

## Validation Rules

### device_id
- Type: String
- Pattern: `^[a-zA-Z0-9-_]+$`
- Required: Yes
- Example: `esp32-001`, `device_123`

### timestamp
- Type: String (ISO 8601)
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Required: Yes
- Example: `2025-10-16T18:33:58.123Z`

### ld2410.distance
- Type: Number
- Range: 0-600
- Unit: Centimeters
- Required: Yes (if ld2410 present)

### ld2410.energy
- Type: Number
- Range: 0-100
- Unit: Percentage
- Required: Yes (if ld2410 present)

### mq134.gas_concentration
- Type: Number
- Range: ≥0
- Required: Yes (if mq134 present)

### mq134.unit
- Type: String
- Allowed values: `"ppm"`, `"ppb"`
- Required: Yes (if mq134 present)

## Rate Limits

Currently, no rate limits are enforced. For production use:

- Recommended: 100 requests/minute per device
- Batch endpoint: 10 requests/minute per device
- Max batch size: 100 readings

## Examples

### cURL Examples

**Submit single reading:**

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

**Submit batch:**

```bash
curl -X POST http://localhost:3000/api/v1/sensor-data/batch \
  -H "Content-Type: application/json" \
  -d '[
    {
      "device_id": "esp32-001",
      "timestamp": "2025-10-16T18:33:58Z",
      "sensors": {"pir": {"motion_detected": true}}
    },
    {
      "device_id": "esp32-002",
      "timestamp": "2025-10-16T18:34:00Z",
      "sensors": {"pir": {"motion_detected": false}}
    }
  ]'
```

**Health check:**

```bash
curl http://localhost:3000/health
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function submitSensorData(deviceId, sensorData) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/sensor-data',
      {
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        sensors: sensorData
      }
    );
    
    console.log('Success:', response.data);
    return response.data.message_id;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
submitSensorData('esp32-001', {
  ld2410: {
    presence: true,
    distance: 150,
    energy: 75
  },
  pir: {
    motion_detected: true
  }
});
```

### Python Example

```python
import requests
from datetime import datetime

def submit_sensor_data(device_id, sensor_data):
    url = 'http://localhost:3000/api/v1/sensor-data'
    payload = {
        'device_id': device_id,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'sensors': sensor_data
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    return response.json()['message_id']

# Usage
message_id = submit_sensor_data('esp32-001', {
    'mq134': {
        'gas_concentration': 250,
        'unit': 'ppm'
    }
})
print(f'Message ID: {message_id}')
```

## Error Handling

### Client Errors (4xx)

Handle these by fixing the request:

```javascript
try {
  await submitSensorData();
} catch (error) {
  if (error.response?.status === 400) {
    console.error('Validation error:', error.response.data.details);
    // Fix data and retry
  } else if (error.response?.status === 409) {
    console.log('Duplicate data, skipping');
  }
}
```

### Server Errors (5xx)

Implement retry logic with exponential backoff:

```javascript
async function submitWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await submitSensorData(data);
    } catch (error) {
      if (error.response?.status >= 500 && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

## Best Practices

1. **Timestamps**: Always use UTC timestamps in ISO 8601 format
2. **Batch Operations**: Use batch endpoint for multiple readings
3. **Error Handling**: Implement retry logic with exponential backoff
4. **Validation**: Validate data on client side before sending
5. **Monitoring**: Monitor error responses and adjust accordingly
6. **Connection Reuse**: Keep HTTP connections alive for better performance
