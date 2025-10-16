# Device Management Service - Quick Start Guide

This guide will help you get the Device Management Service up and running quickly.

## Prerequisites

- Node.js 18 or higher
- MongoDB 6.0 or higher (or use Docker)
- Redis 7.0 or higher (optional)

## Quick Start with Docker Compose (Recommended)

The easiest way to run the service is using Docker Compose:

```bash
# From the device-management directory
docker-compose up
```

This will start:
- MongoDB on port 27017
- Redis on port 6379
- Device Management Service on port 3000

Access the API documentation at: http://localhost:3000/api-docs

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` if needed to match your MongoDB and Redis configuration.

### 3. Start MongoDB (if not using Docker)

```bash
# Using MongoDB installed locally
mongod --dbpath /path/to/data/db

# Or using Docker
docker run -d -p 27017:27017 --name device-mongo mongo:7
```

### 4. Start Redis (optional but recommended)

```bash
# Using Redis installed locally
redis-server

# Or using Docker
docker run -d -p 6379:6379 --name device-redis redis:7-alpine
```

### 5. Run the Development Server

```bash
npm run dev
```

The service will start on http://localhost:3000

## Testing the Service

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Register a Device

```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test ESP32 Device",
    "sensors": [
      {"type": "LD2410", "enabled": true},
      {"type": "PIR", "enabled": true},
      {"type": "MQ134", "enabled": true}
    ],
    "location": {
      "name": "Lab Room 101"
    }
  }'
```

Save the returned `deviceId` and `token` for future requests.

### Get Device Details

```bash
curl http://localhost:3000/api/devices/{deviceId}
```

### Update Device Status (requires authentication)

```bash
curl -X PUT http://localhost:3000/api/devices/{deviceId}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"status": "online"}'
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Run the built application
npm start
```

## Docker Deployment

```bash
# Build the Docker image
docker build -t device-management:1.0.0 .

# Run the container
docker run -d \
  --name device-management \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/device-management \
  -e JWT_SECRET=your-secret-key \
  device-management:1.0.0
```

## Common Issues

### MongoDB Connection Error

**Problem**: `MongoServerError: connect ECONNREFUSED`

**Solution**: 
- Ensure MongoDB is running
- Check the MONGODB_URI in your `.env` file
- If using Docker, use `mongodb://host.docker.internal:27017/device-management`

### Redis Connection Error

**Problem**: Redis connection failed

**Solution**: 
- The service will continue without Redis (caching disabled)
- To enable caching, ensure Redis is running
- Check REDIS_HOST and REDIS_PORT in your `.env` file

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**: 
- Change the PORT in your `.env` file
- Or stop the process using port 3000: `lsof -ti:3000 | xargs kill -9`

## Next Steps

- Read the full [README.md](README.md) for detailed API documentation
- Explore the API using Swagger UI at http://localhost:3000/api-docs
- Check the [Device Onboarding Guide](README.md#device-onboarding-guide) for ESP32 integration
- Review [Configuration Examples](README.md#configuration-examples) for sensor setup

## API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices/register` | Register a new device |
| POST | `/api/devices/register/bulk` | Register multiple devices |
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:deviceId` | Get device details |
| PUT | `/api/devices/:deviceId` | Update device |
| DELETE | `/api/devices/:deviceId` | Delete device |
| PUT | `/api/devices/:deviceId/config` | Update device configuration |
| PUT | `/api/devices/config/bulk` | Bulk update configurations |
| POST | `/api/devices/:deviceId/config/rollback` | Rollback configuration |
| GET | `/api/devices/:deviceId/config/history` | Get configuration history |
| PUT | `/api/devices/:deviceId/status` | Update device status |
| GET | `/api/devices/:deviceId/health` | Health check |
| GET | `/api/devices/:deviceId/stats` | Get device statistics |

## Support

For more information, consult the full documentation in [README.md](README.md).
