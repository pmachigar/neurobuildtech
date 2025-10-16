# Integration Guide

This guide explains how to integrate the Data Ingestion Service with other components of the neurobuildtech platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ESP32 Devices                           │
│  (LD2410, PIR, MQ134 sensors)                              │
└──────────────┬──────────────────────┬──────────────────────┘
               │                      │
        MQTT   │                HTTP  │
               │                      │
               ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Ingestion Service                          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │   MQTT     │  │    HTTP     │  │  WebSocket   │         │
│  │  Handler   │  │  Handler    │  │   Server     │         │
│  └──────┬─────┘  └──────┬──────┘  └──────┬───────┘         │
│         │               │                 │                  │
│         └───────────────┼─────────────────┘                  │
│                         ▼                                    │
│              ┌──────────────────┐                            │
│              │   Validation     │                            │
│              │   Processing     │                            │
│              │   Enrichment     │                            │
│              └────────┬─────────┘                            │
│                       │                                      │
│                       ▼                                      │
│              ┌──────────────────┐                            │
│              │   Redis Queue    │                            │
│              └────────┬─────────┘                            │
└───────────────────────┼──────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌────────────┐
│  Storage   │  │  Real-time   │  │  Analytics │
│  Service   │  │   Clients    │  │  Service   │
└────────────┘  └──────────────┘  └────────────┘
```

## Integration Points

### 1. Device Management Service Integration

The Data Ingestion Service can integrate with a Device Management Service for authentication and device metadata.

#### Device Registration

When a device registers, update the metadata in the data processor:

```typescript
import axios from 'axios';

// In your device management service
async function registerDevice(deviceId: string, metadata: DeviceMetadata) {
  // Register device in your system
  await deviceRegistry.register(deviceId, metadata);
  
  // Update data ingestion service
  await axios.post('http://data-ingestion:3000/api/v1/devices/metadata', {
    device_id: deviceId,
    metadata: metadata
  });
}
```

#### Device Authentication

Add authentication middleware to the HTTP service:

```typescript
// src/http/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export async function authenticateDevice(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  
  // Verify with device management service
  const device = await deviceManagementClient.verifyApiKey(apiKey);
  
  if (!device) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.device = device;
  next();
}
```

### 2. Storage Service Integration

Consume data from the Redis queue for persistence.

#### Consumer Implementation

```typescript
import { redisQueue } from './queue/redis-queue';
import { storageService } from './storage-service';

class StorageConsumer {
  async start() {
    while (true) {
      try {
        const message = await redisQueue.dequeue();
        
        if (!message) {
          await sleep(100);
          continue;
        }
        
        // Store in database
        await storageService.saveSensorReading(message.data);
        
      } catch (error) {
        console.error('Error processing message:', error);
        await redisQueue.requeueWithRetry(message, error.message);
      }
    }
  }
}

const consumer = new StorageConsumer();
consumer.start();
```

#### Database Schema

Example PostgreSQL schema:

```sql
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_sensor_readings_sensor_type ON sensor_readings(sensor_type);
CREATE INDEX idx_sensor_readings_data ON sensor_readings USING GIN(data);
```

Example insertion:

```typescript
async function saveSensorReading(reading: EnrichedSensorReading) {
  const queries = [];
  
  // Insert LD2410 data
  if (reading.sensors.ld2410) {
    queries.push({
      text: `INSERT INTO sensor_readings 
             (device_id, timestamp, received_at, sensor_type, data, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
      values: [
        reading.device_id,
        reading.timestamp,
        reading.received_at,
        'ld2410',
        reading.sensors.ld2410,
        reading.device_metadata
      ]
    });
  }
  
  // Insert PIR data
  if (reading.sensors.pir) {
    queries.push({
      text: `INSERT INTO sensor_readings 
             (device_id, timestamp, received_at, sensor_type, data, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
      values: [
        reading.device_id,
        reading.timestamp,
        reading.received_at,
        'pir',
        reading.sensors.pir,
        reading.device_metadata
      ]
    });
  }
  
  // Execute all queries in a transaction
  await db.transaction(async (trx) => {
    for (const query of queries) {
      await trx.query(query.text, query.values);
    }
  });
}
```

### 3. Real-Time Analytics Integration

Subscribe to sensor events via Redis pub/sub.

```typescript
import { redisQueue } from './queue/redis-queue';

class AnalyticsService {
  async start() {
    await redisQueue.subscribe('sensor-events', (message) => {
      const data = JSON.parse(message);
      this.processSensorData(data);
    });
  }
  
  private processSensorData(data: EnrichedSensorReading) {
    // Calculate real-time analytics
    if (data.sensors.ld2410?.presence) {
      this.updateOccupancy(data.device_id, true);
    }
    
    if (data.sensors.mq134) {
      this.checkAirQualityAlert(data.device_id, data.sensors.mq134);
    }
    
    // Update real-time dashboard
    this.broadcastToDashboard(data);
  }
}
```

### 4. Alert Service Integration

Monitor sensor data for alert conditions.

```typescript
class AlertService {
  async start() {
    await redisQueue.subscribe('sensor-events', (message) => {
      const data = JSON.parse(message);
      this.checkAlertConditions(data);
    });
  }
  
  private async checkAlertConditions(data: EnrichedSensorReading) {
    // Gas concentration alert
    if (data.sensors.mq134) {
      const threshold = 500; // ppm
      if (data.sensors.mq134.gas_concentration > threshold) {
        await this.sendAlert({
          type: 'high_gas_concentration',
          device_id: data.device_id,
          value: data.sensors.mq134.gas_concentration,
          threshold: threshold,
          timestamp: data.timestamp
        });
      }
    }
    
    // Presence detection alert (for security)
    if (data.sensors.ld2410?.presence) {
      const location = data.device_metadata?.location;
      const isSecureArea = await this.isSecureArea(location);
      
      if (isSecureArea && !this.isBusinessHours()) {
        await this.sendAlert({
          type: 'unauthorized_presence',
          device_id: data.device_id,
          location: location,
          timestamp: data.timestamp
        });
      }
    }
  }
}
```

### 5. API Gateway Integration

Place the data ingestion service behind an API gateway.

#### Kong Configuration

```yaml
services:
  - name: data-ingestion
    url: http://data-ingestion:3000
    routes:
      - name: sensor-data-route
        paths:
          - /api/v1/sensor-data
        methods:
          - POST
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: key-auth
        config:
          key_names:
            - x-api-key
```

#### NGINX Configuration

```nginx
upstream data_ingestion {
    server data-ingestion-1:3000;
    server data-ingestion-2:3000;
    server data-ingestion-3:3000;
}

server {
    listen 80;
    server_name api.neurobuild.com;
    
    location /api/v1/sensor-data {
        proxy_pass http://data_ingestion;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Rate limiting
        limit_req zone=sensor_data burst=20 nodelay;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    location /health {
        proxy_pass http://data_ingestion;
        access_log off;
    }
}

limit_req_zone $binary_remote_addr zone=sensor_data:10m rate=100r/m;
```

## Deployment Scenarios

### Single Instance Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - mosquitto-data:/mosquitto/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  data-ingestion:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
      - REDIS_HOST=redis
    depends_on:
      - mosquitto
      - redis

volumes:
  mosquitto-data:
  redis-data:
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-ingestion
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-ingestion
  template:
    metadata:
      labels:
        app: data-ingestion
    spec:
      containers:
      - name: data-ingestion
        image: neurobuild/data-ingestion:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 3001
          name: websocket
        - containerPort: 9090
          name: metrics
        env:
        - name: MQTT_BROKER_URL
          value: mqtt://mosquitto:1883
        - name: REDIS_HOST
          value: redis-service
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: data-ingestion-service
spec:
  selector:
    app: data-ingestion
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  - name: websocket
    port: 3001
    targetPort: 3001
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: data-ingestion-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-ingestion
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring Integration

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'data-ingestion'
    static_configs:
      - targets: ['data-ingestion:9090']
    scrape_interval: 15s
```

### Grafana Dashboard

Import the following metrics:

```
# Ingestion rate
rate(sensor_data_ingested_total[5m])

# Error rate
rate(sensor_data_errors_total[5m])

# Processing latency (p95)
histogram_quantile(0.95, rate(sensor_data_processing_latency_seconds_bucket[5m]))

# Active connections
active_connections

# Queue size
queue_size
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: data_ingestion
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(sensor_data_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          
      - alert: QueueBacklog
        expr: queue_size{queue_name="sensor-data"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Queue backlog detected
          
      - alert: ServiceDown
        expr: up{job="data-ingestion"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Data ingestion service is down
```

## Testing Integration

### Integration Test Example

```typescript
import axios from 'axios';
import mqtt from 'mqtt';

describe('Integration Tests', () => {
  it('should process data from MQTT and make it available via WebSocket', async () => {
    // Connect MQTT client
    const mqttClient = mqtt.connect('mqtt://localhost:1883');
    
    // Connect WebSocket client
    const ws = new WebSocket('ws://localhost:3001');
    
    // Subscribe to sensor events
    ws.send(JSON.stringify({ type: 'subscribe' }));
    
    // Publish data via MQTT
    mqttClient.publish('neurobuild/sensors/test-device/data', JSON.stringify({
      device_id: 'test-device',
      timestamp: new Date().toISOString(),
      sensors: {
        pir: { motion_detected: true }
      }
    }));
    
    // Wait for WebSocket message
    const message = await new Promise((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'sensor-data') {
          resolve(msg.data);
        }
      });
    });
    
    // Verify
    expect(message.device_id).toBe('test-device');
    expect(message.sensors.pir.motion_detected).toBe(true);
  });
});
```

## Security Considerations

### TLS/SSL Configuration

```typescript
// src/config/tls.ts
import fs from 'fs';

export const tlsOptions = {
  mqtt: {
    key: fs.readFileSync('./certs/mqtt-client-key.pem'),
    cert: fs.readFileSync('./certs/mqtt-client-cert.pem'),
    ca: fs.readFileSync('./certs/ca-cert.pem'),
    rejectUnauthorized: true
  },
  http: {
    key: fs.readFileSync('./certs/server-key.pem'),
    cert: fs.readFileSync('./certs/server-cert.pem')
  }
};
```

### Authentication & Authorization

Implement JWT-based authentication:

```typescript
import jwt from 'jsonwebtoken';

export function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.device = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Troubleshooting

### Common Integration Issues

1. **Data not reaching storage service**
   - Check Redis queue size
   - Verify consumer is running
   - Check network connectivity

2. **WebSocket clients not receiving data**
   - Verify Redis pub/sub is working
   - Check WebSocket connection status
   - Review subscription filters

3. **High latency**
   - Check Redis performance
   - Monitor queue backlog
   - Review processing times in metrics

## Support

For integration support:
- Review logs: `docker-compose logs -f data-ingestion`
- Check metrics: http://localhost:9090/metrics
- Test endpoints: Use provided examples
- Open an issue: https://github.com/pmachigar/neurobuildtech/issues
