# Architecture Documentation

## System Overview

The Data Ingestion Service is a scalable, fault-tolerant system designed to collect sensor data from ESP32-S3 IoT devices and make it available for downstream processing and real-time monitoring.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ESP32-S3 Devices                             │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                │
│  │  LD2410    │    │    PIR     │    │   MQ134    │                │
│  │  Presence  │    │   Motion   │    │    Gas     │                │
│  └────────────┘    └────────────┘    └────────────┘                │
└───────────────┬──────────────────┬──────────────────┬───────────────┘
                │                  │                  │
         MQTT   │           HTTP   │       WebSocket  │
         QoS 1  │           REST   │       Real-time  │
                │                  │                  │
                ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     Data Ingestion Service                            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Protocol Layer                             │   │
│  │  ┌──────────┐    ┌──────────┐    ┌────────────┐             │   │
│  │  │  MQTT    │    │   HTTP   │    │ WebSocket  │             │   │
│  │  │ Handler  │    │ Handler  │    │   Server   │             │   │
│  │  └────┬─────┘    └────┬─────┘    └─────┬──────┘             │   │
│  └───────┼───────────────┼────────────────┼────────────────────┘   │
│          │               │                │                          │
│  ┌───────▼───────────────▼────────────────▼────────────────────┐   │
│  │                  Validation Layer                            │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │        Schema Validator (Joi)                  │         │   │
│  │  │  • Device ID validation                        │         │   │
│  │  │  • Timestamp validation                        │         │   │
│  │  │  • Sensor data validation (LD2410, PIR, MQ134) │         │   │
│  │  │  • Range validation                            │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                 Processing Layer                             │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │         Data Processor                         │         │   │
│  │  │  • Timestamp normalization                     │         │   │
│  │  │  • Duplicate detection                         │         │   │
│  │  │  • Metadata enrichment                         │         │   │
│  │  │  • Cache management                            │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                   Queue Layer                                │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │         Redis Queue Manager                    │         │   │
│  │  │  • Message enqueueing                          │         │   │
│  │  │  • Retry logic (max 3 attempts)                │         │   │
│  │  │  • Dead Letter Queue (DLQ)                     │         │   │
│  │  │  • Pub/Sub for real-time events                │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │         Circuit Breaker                        │         │   │
│  │  │  • Failure detection (threshold: 5)            │         │   │
│  │  │  • Open/Closed/Half-Open states                │         │   │
│  │  │  • Automatic recovery                          │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  └───────────────────────┬──────────────────┬───────────────────┘   │
│                          │                  │                        │
│  ┌───────────────────────▼──────┐  ┌────────▼───────────────────┐   │
│  │   Observability Layer         │  │   Reliability Layer        │   │
│  │  ┌──────────────────────┐    │  │  ┌──────────────────────┐ │   │
│  │  │  Structured Logging  │    │  │  │  Health Checks       │ │   │
│  │  │  (Winston)           │    │  │  │  • /health           │ │   │
│  │  └──────────────────────┘    │  │  │  • /ready            │ │   │
│  │                               │  │  └──────────────────────┘ │   │
│  │  ┌──────────────────────┐    │  │                            │   │
│  │  │  Metrics Collection  │    │  │  ┌──────────────────────┐ │   │
│  │  │  (Prometheus)        │    │  │  │  Error Handling      │ │   │
│  │  │  • Ingestion rate    │    │  │  │  • Try-catch blocks  │ │   │
│  │  │  • Error rate        │    │  │  │  • Graceful shutdown │ │   │
│  │  │  • Latency (p95)     │    │  │  └──────────────────────┘ │   │
│  │  │  • Queue size        │    │  │                            │   │
│  │  └──────────────────────┘    │  └────────────────────────────┘   │
│  └───────────────────────────────┘                                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐  ┌───────────────┐  ┌──────────────┐
│   Storage      │  │  Real-time    │  │  Analytics   │
│   Service      │  │  Clients      │  │   Service    │
│  (PostgreSQL,  │  │  (Dashboard,  │  │  (Apache     │
│   TimescaleDB) │  │   Mobile)     │  │   Spark)     │
└────────────────┘  └───────────────┘  └──────────────┘
```

## Component Details

### 1. Protocol Layer

#### MQTT Handler
- **Purpose**: Receive sensor data from ESP32 devices via MQTT
- **Topics**: `neurobuild/sensors/{device_id}/{sensor_type}`
- **QoS**: 1 (at least once delivery)
- **Features**:
  - Automatic reconnection
  - Wildcard topic subscriptions
  - Connection health monitoring
  - Message acknowledgment

#### HTTP Handler
- **Purpose**: REST API for sensor data submission
- **Endpoints**:
  - `POST /api/v1/sensor-data` - Single reading
  - `POST /api/v1/sensor-data/batch` - Batch submission (max 100)
  - `GET /health` - Health check
  - `GET /ready` - Readiness check
  - `GET /metrics` - Prometheus metrics
- **Features**:
  - Request validation
  - Error handling
  - CORS support
  - Rate limiting ready

#### WebSocket Server
- **Purpose**: Real-time sensor data streaming
- **Port**: 3001
- **Features**:
  - Client filtering (by device_id, sensor_type)
  - Heartbeat/ping-pong
  - Connection management
  - Broadcast capability

### 2. Validation Layer

#### Schema Validator
- **Technology**: Joi
- **Responsibilities**:
  - Validate device_id format
  - Validate timestamp (ISO 8601)
  - Validate sensor data types and ranges
  - Strip unknown fields

**Validation Rules**:
```typescript
LD2410: {
  presence: boolean (required)
  distance: number (0-600) (required)
  energy: number (0-100) (required)
}

PIR: {
  motion_detected: boolean (required)
}

MQ134: {
  gas_concentration: number (≥0) (required)
  unit: "ppm" | "ppb" (required)
}
```

### 3. Processing Layer

#### Data Processor
- **Responsibilities**:
  - Normalize timestamps to ISO 8601 with milliseconds
  - Detect duplicates (device_id + timestamp)
  - Enrich with device metadata
  - Maintain processing cache

**Processing Flow**:
```
Input → Duplicate Check → Timestamp Normalize → Metadata Enrich → Output
```

### 4. Queue Layer

#### Redis Queue Manager
- **Technology**: Redis (ioredis)
- **Queue Structure**: List (LPUSH/RPOP)
- **Features**:
  - Message persistence
  - Retry logic (exponential backoff)
  - Dead Letter Queue (DLQ)
  - Pub/Sub for real-time events
  - Queue size monitoring

**Message Flow**:
```
Enqueue → Process → Success ✓
                  → Failure → Retry (max 3) → Success ✓
                                            → DLQ
```

#### Circuit Breaker
- **Purpose**: Protect downstream services from cascading failures
- **States**: Closed → Open → Half-Open → Closed
- **Thresholds**:
  - Failure count: 5
  - Timeout: 60 seconds
- **Behavior**:
  - Closed: Normal operation
  - Open: Reject all requests
  - Half-Open: Allow one request to test recovery

### 5. Observability Layer

#### Structured Logging
- **Technology**: Winston
- **Format**: JSON
- **Levels**: error, warn, info, debug
- **Output**: Console + File (production)

#### Metrics Collection
- **Technology**: Prometheus (prom-client)
- **Metrics**:
  - `sensor_data_ingested_total` (Counter)
  - `sensor_data_errors_total` (Counter)
  - `sensor_data_processing_latency_seconds` (Histogram)
  - `active_connections` (Gauge)
  - `queue_size` (Gauge)

## Data Flow

### Successful Processing Flow

```
1. Device sends data via MQTT/HTTP
   ↓
2. Protocol handler receives data
   ↓
3. Validator validates schema
   ↓
4. Processor checks for duplicates
   ↓
5. Processor normalizes timestamp
   ↓
6. Processor enriches with metadata
   ↓
7. Queue manager enqueues message
   ↓
8. Publish to Redis pub/sub for real-time
   ↓
9. WebSocket clients receive data
   ↓
10. Storage consumer persists to database
```

### Error Handling Flow

```
Error Occurs
   ↓
Logged with context
   ↓
Metrics recorded
   ↓
Circuit breaker check
   ↓
Retry logic (if applicable)
   ↓
Dead Letter Queue (if max retries exceeded)
   ↓
Alert notification (optional)
```

## Scalability

### Horizontal Scaling

The service is designed for horizontal scaling:

- **Stateless Design**: No local state (uses Redis)
- **Load Balancing**: Compatible with any load balancer
- **Shared Queue**: All instances share Redis queue
- **Independent Processing**: Each instance processes independently

### Scaling Configuration

```yaml
# Kubernetes HPA
minReplicas: 3
maxReplicas: 10
targetCPU: 70%
targetMemory: 80%
```

### Performance Characteristics

| Metric | Value |
|--------|-------|
| HTTP Throughput | ~1,000 req/s per instance |
| MQTT Throughput | ~5,000 msg/s per instance |
| WebSocket Connections | ~1,000 concurrent per instance |
| Processing Latency (p95) | <50ms |
| Memory Usage | ~256MB-512MB per instance |
| CPU Usage | ~250m-500m per instance |

## Reliability Features

### 1. Automatic Reconnection
- MQTT: Reconnects with exponential backoff
- Redis: Auto-reconnect via ioredis

### 2. Message Persistence
- Redis queue persists to disk (AOF)
- Messages not lost on restart

### 3. Retry Logic
- 3 retry attempts with exponential backoff
- Configurable retry delay

### 4. Dead Letter Queue
- Failed messages moved to DLQ
- Prevents data loss
- Allows manual review/replay

### 5. Circuit Breaker
- Prevents cascading failures
- Automatic recovery
- Configurable thresholds

### 6. Graceful Shutdown
- Stops accepting new connections
- Completes in-flight requests
- Closes connections cleanly

## Security Considerations

### 1. Network Security
- Use TLS/SSL for MQTT (port 8883)
- Use HTTPS for HTTP API
- Use WSS for WebSocket
- Implement network policies (Kubernetes)

### 2. Authentication
- Device authentication via API keys
- JWT tokens for API access
- MQTT username/password

### 3. Authorization
- Device-level access control
- Topic-based permissions (MQTT)
- Role-based access control (RBAC)

### 4. Data Security
- Validate all inputs
- Sanitize data before storage
- Rate limiting
- Request size limits

### 5. Operational Security
- Run as non-root user
- Read-only root filesystem
- Minimal container image
- Regular security updates

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Ingestion Rate**: Sudden drops indicate device connectivity issues
2. **Error Rate**: Spikes indicate validation or processing problems
3. **Queue Size**: Growth indicates downstream bottleneck
4. **Processing Latency**: Increases indicate performance degradation
5. **Active Connections**: Track device connectivity

### Alerting Rules

```yaml
- High Error Rate: error_rate > 10% for 5 minutes
- Queue Backlog: queue_size > 1000 for 5 minutes
- Service Down: service_up == 0 for 1 minute
- High Latency: p95_latency > 100ms for 5 minutes
```

## Testing Strategy

### Unit Tests
- Validators (29 tests)
- Processors (11 tests)
- Circuit Breaker (7 tests)
- Utilities (11 tests)

### Integration Tests
- End-to-end data flow
- MQTT → Storage
- HTTP → WebSocket
- Error scenarios

### Load Tests
- Sustained load testing
- Spike testing
- Stress testing
- Soak testing

## Deployment Patterns

### 1. Single Instance
- Development/testing
- Low traffic (<100 devices)

### 2. Multi-Instance + Load Balancer
- Production
- Medium traffic (100-1000 devices)
- High availability

### 3. Kubernetes Cluster
- Large scale (>1000 devices)
- Auto-scaling
- Self-healing

## Future Enhancements

### Phase 2
- [ ] Kafka integration for high throughput
- [ ] Message compression
- [ ] Data aggregation
- [ ] Advanced filtering
- [ ] Custom alerts

### Phase 3
- [ ] Machine learning integration
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Edge processing

## References

- [README.md](./README.md) - Getting started guide
- [QUICKSTART.md](./QUICKSTART.md) - Quick setup
- [API.md](./docs/API.md) - REST API documentation
- [MQTT.md](./docs/MQTT.md) - MQTT protocol guide
- [INTEGRATION.md](./docs/INTEGRATION.md) - Integration patterns
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
