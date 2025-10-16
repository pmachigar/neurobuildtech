# Analytics Service

Real-time sensor event processing and analytics service for NeuroBuildTech IoT platform.

## Features

### Event Processing
- **Threshold-based alerting** - Configurable threshold rules for sensor values (MQ134 gas sensors, etc.)
- **Presence detection** - Event generation for LD2410 presence sensors
- **Motion detection** - PIR motion sensor event processing
- **Anomaly detection** - Automatic detection of unusual patterns and sensor failures
- **Event correlation** - Multi-sensor correlation and aggregation

### Alert System
- **Configurable rules** - Dynamic rule configuration via API
- **Multiple alert types** - Critical, warning, and info levels
- **Multi-channel notifications**:
  - Email (via SMTP)
  - Webhooks (REST API callbacks)
  - SMS (via Twilio)
  - Push notifications (placeholder for future)
- **Alert throttling** - Prevent notification spam with configurable throttle periods
- **Deduplication** - Automatic duplicate alert detection and suppression

### Real-time Analytics
- **Running statistics** - Averages, min/max, standard deviation
- **Trend detection** - Automatic spike, drop, and flatline detection
- **Occupancy tracking** - Real-time space occupancy based on presence/motion sensors
- **Air quality monitoring** - Gas sensor concentration tracking and alerting

### Architecture
- **Stateless processing** - Scalable worker architecture
- **MQTT integration** - Real-time event ingestion from MQTT broker
- **Redis support** - State management and Redis Streams support
- **REST API** - Full API for rule management and analytics
- **Event sourcing** - Event history and state tracking

## Quick Start

### Installation

```bash
cd backend/services/analytics
npm install
```

### Configuration

Create a `.env` file in the service directory:

```env
# Service Configuration
SERVICE_NAME=analytics-service
PORT=3000
NODE_ENV=development

# MQTT Configuration
MQTT_ENABLED=true
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPICS=sensors/#

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_STREAM=sensor-events

# Email Notifications
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=alerts@neurobuildtech.com
EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# SMS Notifications (Twilio)
SMS_ENABLED=false
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_RECIPIENTS=+1234567890,+0987654321

# Webhook Configuration
WEBHOOK_URLS=https://example.com/webhook,https://backup.com/webhook

# Processing Configuration
ANOMALY_DETECTION=true
CORRELATION=true
MAX_HISTORY_SIZE=100
CORRELATION_WINDOW=60000
SENSOR_TIMEOUT_MINUTES=10

# API Configuration
API_ENABLED=true
API_AUTH_REQUIRED=false
API_KEY=your-secure-api-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Running the Service

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Using Docker

```bash
# Build image
docker build -t analytics-service .

# Run container
docker run -p 3000:3000 \
  -e MQTT_HOST=mqtt-broker \
  -e REDIS_HOST=redis \
  analytics-service
```

## API Documentation

### Health & Status

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2025-10-16T18:45:00.000Z"
}
```

#### GET /api/status
Service status and metrics.

**Response:**
```json
{
  "service": "analytics-service",
  "worker": {
    "is_running": true,
    "uptime_seconds": 3600,
    "processed_count": 1523,
    "error_count": 2,
    "events_per_second": "0.42",
    "success_rate": "99.87"
  },
  "config": {...},
  "timestamp": "2025-10-16T18:45:00.000Z"
}
```

### Rules Management

#### GET /api/rules
List all rules with optional filters.

**Query Parameters:**
- `sensor_type` - Filter by sensor type
- `alert_level` - Filter by alert level
- `enabled` - Filter by enabled status (true/false)

**Response:**
```json
{
  "rules": [
    {
      "rule_id": "gas_high_critical",
      "sensor_type": "mq134",
      "condition": "gas_concentration > 500",
      "alert_level": "critical",
      "actions": ["email", "webhook", "sms"],
      "throttle_minutes": 15,
      "enabled": true,
      "created_at": "2025-10-16T18:00:00.000Z",
      "updated_at": "2025-10-16T18:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/rules/:ruleId
Get a specific rule by ID.

#### POST /api/rules
Create a new rule.

**Request Body:**
```json
{
  "rule_id": "custom_rule",
  "sensor_type": "mq134",
  "condition": "gas_concentration > 300",
  "alert_level": "warning",
  "actions": ["email", "webhook"],
  "throttle_minutes": 30,
  "description": "Custom gas threshold rule"
}
```

#### PUT /api/rules/:ruleId
Update an existing rule.

#### DELETE /api/rules/:ruleId
Delete a rule.

#### POST /api/rules/:ruleId/toggle
Enable or disable a rule.

**Request Body:**
```json
{
  "enabled": false
}
```

#### POST /api/rules/:ruleId/test
Test a rule against sample data.

**Request Body:**
```json
{
  "device_id": "sensor_1",
  "sensor_type": "mq134",
  "gas_concentration": 550
}
```

**Response:**
```json
{
  "success": true,
  "rule_id": "gas_high_critical",
  "condition": "gas_concentration > 500",
  "sample_data": {...},
  "would_trigger": true,
  "alert_level": "critical",
  "actions": ["email", "webhook", "sms"]
}
```

### Templates

#### GET /api/templates
List available rule templates.

#### POST /api/templates/:templateName
Create a rule from a template.

**Request Body (optional overrides):**
```json
{
  "throttle_minutes": 30,
  "actions": ["webhook"]
}
```

### Analytics

#### GET /api/analytics/occupancy
Get occupancy statistics for all locations.

**Response:**
```json
{
  "total_locations": 5,
  "occupied_count": 2,
  "vacant_count": 3,
  "locations": {
    "room_101": true,
    "room_102": false,
    "room_103": true
  }
}
```

#### GET /api/analytics/occupancy/:location
Get occupancy status for a specific location.

#### GET /api/analytics/delivery-stats
Get notification delivery statistics.

#### GET /api/analytics/rule-stats
Get rule usage statistics.

### Event Processing

#### POST /api/events
Inject an event for processing (useful for testing).

**Request Body:**
```json
{
  "device_id": "sensor_1",
  "sensor_type": "mq134",
  "gas_concentration": 650,
  "timestamp": "2025-10-16T18:45:00.000Z"
}
```

### Worker Management

#### POST /api/worker/start
Start the event worker.

#### POST /api/worker/stop
Stop the event worker.

#### GET /api/worker/metrics
Get worker performance metrics.

#### POST /api/worker/metrics/reset
Reset worker metrics.

### Anomaly Detection

#### POST /api/anomaly/check-failures
Check for sensor failures.

**Query Parameters:**
- `timeout` - Minutes of inactivity to consider failed (default: 10)

## Rule Configuration

### Rule Structure

```json
{
  "rule_id": "unique_identifier",
  "sensor_type": "mq134|ld2410|pir|temperature|humidity",
  "device_id": "optional_specific_device",
  "condition": "field operator value",
  "alert_level": "critical|warning|info",
  "actions": ["email", "webhook", "sms", "push"],
  "throttle_minutes": 15,
  "description": "Human-readable description",
  "enabled": true
}
```

### Condition Syntax

Conditions support simple comparison operators:
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `==` - Equal
- `!=` - Not equal

**Examples:**
```
gas_concentration > 500
temperature < 10
humidity >= 80
value == 1
```

### Available Templates

- `gas_high_critical` - Critical gas concentration (>500)
- `gas_high_warning` - Elevated gas concentration (>300)
- `presence_detected` - Presence sensor detection
- `motion_detected` - Motion sensor detection
- `temperature_high` - High temperature (>35°C)
- `temperature_low` - Low temperature (<10°C)
- `humidity_high` - High humidity (>80%)

## Processors

### Threshold Processor
Evaluates sensor data against configured threshold rules and triggers alerts when conditions are met.

**Features:**
- Supports complex conditions with nested fields
- Configurable throttling to prevent alert spam
- Per-device and global rules
- Multiple alert levels

### Anomaly Detector
Automatically detects unusual patterns in sensor data without predefined rules.

**Detections:**
- **Sudden spikes** - Values >3 standard deviations above average
- **Sudden drops** - Values >3 standard deviations below average
- **Flatline** - No variation in sensor readings
- **Out of range** - Values outside valid sensor ranges
- **Rapid fluctuation** - Excessive value changes
- **Sensor failures** - No data received within timeout period

### Correlation Processor
Correlates events across multiple sensors to provide context and enhanced insights.

**Features:**
- Presence + motion correlation for confirmed occupancy
- Gas levels with occupancy awareness
- Multi-sensor anomaly detection
- Real-time occupancy tracking

## Notification Channels

### Email
Sends HTML-formatted email alerts via SMTP.

**Configuration:**
```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=alerts@neurobuildtech.com
EMAIL_RECIPIENTS=admin@example.com,ops@example.com
```

### Webhooks
Posts alert data to configured webhook URLs.

**Payload:**
```json
{
  "alert": {
    "alert_id": "alert_1697475900000_abc123",
    "rule_id": "gas_high_critical",
    "alert_level": "critical",
    "sensor_type": "mq134",
    "device_id": "sensor_1",
    "timestamp": "2025-10-16T18:45:00.000Z",
    "message": "CRITICAL: gas_high_critical - gas_concentration > 500 (value: 650)"
  },
  "timestamp": "2025-10-16T18:45:00.000Z",
  "event_type": "sensor_alert"
}
```

### SMS (Twilio)
Sends SMS alerts via Twilio.

**Configuration:**
```env
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_RECIPIENTS=+1234567890,+0987654321
```

## Testing

The service includes comprehensive test suites for all major components.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Tests cover:
- Threshold processing and condition evaluation
- Anomaly detection algorithms
- Rule management and validation
- Alert notification and deduplication
- Event correlation logic

## Monitoring

### Metrics

The service exposes metrics via the `/api/worker/metrics` endpoint:

- `is_running` - Worker status
- `uptime_seconds` - Worker uptime
- `processed_count` - Total events processed
- `error_count` - Processing errors
- `events_per_second` - Processing throughput
- `success_rate` - Processing success rate

### Logging

Logs include:
- Event processing activities
- Alert triggers and deliveries
- Anomaly detections
- Worker status changes
- Errors and warnings

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Analytics Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  MQTT Client │────────▶│ Event Worker │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│  ┌──────────────┐                │                          │
│  │ Redis Client │────────────────┘                          │
│  └──────────────┘                │                          │
│                                   │                          │
│                          ┌────────▼────────┐                │
│                          │   Processors    │                │
│                          ├─────────────────┤                │
│                          │ • Threshold     │                │
│                          │ • Anomaly       │                │
│                          │ • Correlation   │                │
│                          └────────┬────────┘                │
│                                   │                          │
│                          ┌────────▼────────┐                │
│                          │  Rules Engine   │                │
│                          └────────┬────────┘                │
│                                   │                          │
│                          ┌────────▼────────┐                │
│                          │ Alert Notifier  │                │
│                          ├─────────────────┤                │
│                          │ • Email         │                │
│                          │ • Webhook       │                │
│                          │ • SMS           │                │
│                          └─────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                     REST API                          │   │
│  │  • Rules Management                                   │   │
│  │  • Analytics Queries                                  │   │
│  │  • Worker Control                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Future Enhancements

- [ ] Machine learning integration for predictive analytics
- [ ] Custom rule engine with advanced expressions
- [ ] Complex multi-sensor correlation scenarios
- [ ] Time-series analytics and forecasting
- [ ] Dashboard UI for rule management
- [ ] Alert acknowledgment workflow
- [ ] Historical alert analysis
- [ ] Performance optimization for high-throughput scenarios
- [ ] Distributed processing support
- [ ] GraphQL API support

## Contributing

When contributing to this service:

1. Write tests for new features
2. Maintain test coverage above 80%
3. Follow the existing code structure
4. Update this README with new features
5. Ensure all tests pass before submitting

## License

ISC
