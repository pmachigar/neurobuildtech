# Quick Start Guide

Get the Analytics Service up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed (for full stack)

## Option 1: Quick Start with Docker Compose (Recommended)

This will start the complete stack including MQTT broker, Redis, and the Analytics Service.

```bash
# Navigate to the service directory
cd backend/services/analytics

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f analytics

# Stop services
docker-compose down
```

The service will be available at:
- Analytics API: http://localhost:3000
- MQTT Broker: mqtt://localhost:1883
- Redis: localhost:6379

## Option 2: Local Development

Run the service locally for development:

```bash
# Navigate to the service directory
cd backend/services/analytics

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# For local testing, you can use the defaults

# Start Redis (if not using Docker)
# redis-server

# Start MQTT broker (if not using Docker)
# mosquitto -c mosquitto.conf

# Start the service
npm start

# Or for development with auto-reload
npm run dev
```

## Testing the Service

### 1. Check Service Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2025-10-16T18:45:00.000Z"
}
```

### 2. Run API Tests

```bash
node examples/test-api.js
```

This will test all major API endpoints and show you how to use them.

### 3. Publish Test Events

In a new terminal, run:

```bash
node examples/publish-test-events.js
```

This will publish simulated sensor events to MQTT. You should see the analytics service processing them in real-time.

## Using the API

### List Available Rules

```bash
curl http://localhost:3000/api/rules
```

### Create a Custom Rule

```bash
curl -X POST http://localhost:3000/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": "my_custom_rule",
    "sensor_type": "mq134",
    "condition": "gas_concentration > 300",
    "alert_level": "warning",
    "actions": ["webhook"],
    "throttle_minutes": 15
  }'
```

### Test a Rule

```bash
curl -X POST http://localhost:3000/api/rules/my_custom_rule/test \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "sensor_1",
    "sensor_type": "mq134",
    "gas_concentration": 400
  }'
```

### Inject a Test Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "sensor_1",
    "sensor_type": "mq134",
    "gas_concentration": 550,
    "timestamp": "2025-10-16T18:45:00.000Z"
  }'
```

### Get Occupancy Status

```bash
curl http://localhost:3000/api/analytics/occupancy
```

### Get Worker Metrics

```bash
curl http://localhost:3000/api/worker/metrics
```

## Common Configurations

### Enable Email Notifications

Edit your `.env` file:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=alerts@neurobuildtech.com
EMAIL_RECIPIENTS=admin@example.com,ops@example.com
```

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833).

### Enable SMS Notifications

Edit your `.env` file:

```env
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_RECIPIENTS=+1234567890,+0987654321
```

Get your Twilio credentials from https://www.twilio.com/console

### Configure Webhooks

Edit your `.env` file:

```env
WEBHOOK_URLS=https://your-app.com/webhook,https://backup-app.com/webhook
```

Your webhook endpoint will receive POST requests with alert data:

```json
{
  "alert": {
    "alert_id": "alert_1697475900000_abc123",
    "rule_id": "gas_high_critical",
    "alert_level": "critical",
    "sensor_type": "mq134",
    "device_id": "sensor_1",
    "timestamp": "2025-10-16T18:45:00.000Z"
  },
  "timestamp": "2025-10-16T18:45:00.000Z",
  "event_type": "sensor_alert"
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### Service won't start

1. Check if ports 3000, 1883, and 6379 are available
2. Verify Docker is running (if using docker-compose)
3. Check logs: `docker-compose logs analytics`

### MQTT connection fails

1. Verify MQTT broker is running: `docker-compose ps mqtt`
2. Check MQTT_HOST and MQTT_PORT in your configuration
3. Test MQTT connection: `mosquitto_sub -h localhost -t sensors/#`

### Redis connection fails

1. Verify Redis is running: `docker-compose ps redis`
2. Check REDIS_HOST and REDIS_PORT in your configuration
3. Test Redis: `redis-cli ping`

### No events being processed

1. Check if worker is running: `curl http://localhost:3000/api/worker/metrics`
2. Verify MQTT or Redis is enabled in configuration
3. Check if events are being published to correct topics

## Next Steps

- Read the [full README](README.md) for detailed documentation
- Explore the [API documentation](README.md#api-documentation)
- Learn about [rule configuration](README.md#rule-configuration)
- Set up [notification channels](README.md#notification-channels)
- Configure [anomaly detection](README.md#anomaly-detector)

## Support

For issues or questions:
- Check the [README](README.md)
- Review [examples](examples/)
- Create an issue on GitHub
