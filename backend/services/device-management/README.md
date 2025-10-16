# Device Management Service

IoT Device Management Service for ESP32-S3 devices with LD2410, PIR, and MQ134 sensors.

## Features

- **Device Registration and Identification**
  - Unique device ID generation
  - Device metadata storage (type, sensors, location, etc.)
  - Bulk device registration support

- **Configuration Management**
  - Per-device configuration management
  - Bulk configuration updates
  - Configuration versioning and rollback capability

- **Device Status and Connectivity Monitoring**
  - Real-time device status tracking (online/offline/maintenance)
  - Last seen timestamp
  - Health check endpoints
  - Connection statistics and uptime tracking

- **Security**
  - Device authentication using JWT tokens
  - API key generation for devices
  - Secure device onboarding flow
  - Access control for device operations

- **REST API**
  - Complete REST API for all operations
  - OpenAPI/Swagger documentation
  - Integration-ready endpoints

## Prerequisites

- Node.js 18+ or Docker
- MongoDB 6.0+
- Redis 7.0+ (optional but recommended for caching)

## Installation

### Local Development

1. Clone the repository and navigate to the service directory:
```bash
cd backend/services/device-management
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/device-management
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

5. Start the development server:
```bash
npm run dev
```

### Docker

Build and run using Docker:

```bash
docker build -t device-management:latest .
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/device-management \
  -e REDIS_HOST=host.docker.internal \
  -e JWT_SECRET=your-secret-key \
  device-management:latest
```

## API Documentation

Once the service is running, access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

## API Endpoints

### Device Registration

#### Register a Single Device
```bash
POST /api/devices/register
Content-Type: application/json

{
  "name": "Living Room Sensor",
  "deviceType": "ESP32-S3",
  "description": "Motion and air quality sensor",
  "location": {
    "name": "Living Room",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "sensors": [
    {
      "type": "LD2410",
      "enabled": true
    },
    {
      "type": "PIR",
      "enabled": true
    },
    {
      "type": "MQ134",
      "enabled": true
    }
  ],
  "metadata": {
    "firmware": "1.0.0"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32-A1B2C3D4",
    "name": "Living Room Sensor",
    "deviceType": "ESP32-S3",
    "sensors": [...],
    "apiKey": "hashed-api-key",
    "token": "jwt-token",
    "status": "offline"
  }
}
```

#### Register Multiple Devices
```bash
POST /api/devices/register/bulk
Content-Type: application/json

{
  "devices": [
    {
      "name": "Device 1",
      "sensors": [...]
    },
    {
      "name": "Device 2",
      "sensors": [...]
    }
  ]
}
```

### Device Management

#### List All Devices
```bash
GET /api/devices?status=online&page=1&limit=20
```

#### Get Device Details
```bash
GET /api/devices/{deviceId}
```

#### Update Device
```bash
PUT /api/devices/{deviceId}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Device
```bash
DELETE /api/devices/{deviceId}
```

### Configuration Management

#### Update Device Configuration
```bash
PUT /api/devices/{deviceId}/config
Content-Type: application/json

{
  "config": {
    "samplingRate": 1000,
    "sensitivity": "high",
    "sensors": {
      "LD2410": {
        "maxDistance": 6
      },
      "PIR": {
        "timeout": 30
      },
      "MQ134": {
        "threshold": 100
      }
    }
  }
}
```

#### Bulk Update Configurations
```bash
PUT /api/devices/config/bulk
Content-Type: application/json

{
  "deviceIds": ["ESP32-A1B2C3D4", "ESP32-E5F6G7H8"],
  "config": {
    "samplingRate": 1000
  }
}
```

#### Rollback Configuration
```bash
POST /api/devices/{deviceId}/config/rollback
Content-Type: application/json

{
  "version": 2
}
```

#### Get Configuration History
```bash
GET /api/devices/{deviceId}/config/history
```

### Device Monitoring

#### Update Device Status
```bash
PUT /api/devices/{deviceId}/status
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "status": "online"
}
```

#### Health Check
```bash
GET /api/devices/{deviceId}/health
Authorization: Bearer {jwt-token}
```

#### Get Device Statistics
```bash
GET /api/devices/{deviceId}/stats
```

## Authentication

### JWT Token Authentication

For device operations that require authentication, include the JWT token in the Authorization header:

```bash
Authorization: Bearer {jwt-token}
```

The JWT token is provided during device registration and includes:
- `deviceId`: The unique device identifier
- `type`: The device type

### API Key Authentication

For certain operations, you can also use API key authentication:

```bash
X-API-Key: {api-key}
```

## Device Onboarding Guide

### Step 1: Register the Device

Use the registration endpoint to create a new device:

```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My ESP32 Device",
    "sensors": [
      {"type": "LD2410", "enabled": true},
      {"type": "PIR", "enabled": true},
      {"type": "MQ134", "enabled": true}
    ]
  }'
```

Save the returned `deviceId`, `apiKey`, and `token`.

### Step 2: Configure the Device

Flash your ESP32-S3 with the device credentials:
- Device ID
- API Key or JWT Token
- Server URL

### Step 3: Update Device Status

Once the device connects, update its status to online:

```bash
curl -X PUT http://localhost:3000/api/devices/{deviceId}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "online"}'
```

### Step 4: Set Device Configuration

Configure the device sensors and parameters:

```bash
curl -X PUT http://localhost:3000/api/devices/{deviceId}/config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "samplingRate": 1000,
      "sensors": {
        "LD2410": {"maxDistance": 6},
        "PIR": {"timeout": 30},
        "MQ134": {"threshold": 100}
      }
    }
  }'
```

### Step 5: Health Monitoring

Implement regular health checks from the device:

```bash
curl http://localhost:3000/api/devices/{deviceId}/health \
  -H "Authorization: Bearer {token}"
```

## Configuration Examples

### Basic Configuration
```json
{
  "config": {
    "samplingRate": 1000,
    "reportingInterval": 60000
  }
}
```

### Advanced Configuration with Sensor Settings
```json
{
  "config": {
    "samplingRate": 500,
    "reportingInterval": 30000,
    "sensors": {
      "LD2410": {
        "enabled": true,
        "maxDistance": 6,
        "sensitivity": 7,
        "detectTimeout": 5
      },
      "PIR": {
        "enabled": true,
        "timeout": 30,
        "sensitivity": "high"
      },
      "MQ134": {
        "enabled": true,
        "threshold": 100,
        "calibration": 1.0,
        "alertLevel": 200
      }
    },
    "alerts": {
      "enabled": true,
      "endpoints": ["http://alert-service/webhook"]
    }
  }
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Linting

Run the linter:

```bash
npm run lint
```

Fix linting issues automatically:

```bash
npm run lint:fix
```

## Building

Build the project:

```bash
npm run build
```

The compiled JavaScript files will be in the `dist` directory.

## Production Deployment

1. Build the Docker image:
```bash
docker build -t device-management:1.0.0 .
```

2. Run with production environment variables:
```bash
docker run -d \
  --name device-management \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://mongo:27017/device-management \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  device-management:1.0.0
```

## Integration with Data Ingestion Module

The device management service provides integration points for data ingestion:

1. **Device Validation**: Validate device credentials before accepting data
2. **Configuration Retrieval**: Get current device configuration
3. **Status Updates**: Update device status based on data reception
4. **Health Monitoring**: Track device connectivity and health

### Example Integration Flow

```javascript
// 1. Validate device token
const deviceInfo = await fetch(`http://device-management:3000/api/devices/${deviceId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 2. Accept data if device is valid and online
if (deviceInfo.status === 'online') {
  // Process sensor data
}

// 3. Update health check
await fetch(`http://device-management:3000/api/devices/${deviceId}/health`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Event Publishing

The service can be extended to publish device lifecycle events:

- `device.registered`
- `device.config.updated`
- `device.status.changed`
- `device.deleted`

## Security Best Practices

1. **Always use HTTPS in production**
2. **Rotate JWT secrets regularly**
3. **Use strong API keys**
4. **Implement rate limiting**
5. **Monitor for suspicious activity**
6. **Keep dependencies updated**
7. **Use environment variables for secrets**

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
- Check connection string format
- Verify network connectivity

### Redis Connection Issues
- The service will continue without Redis if it fails to connect
- Check Redis is running: `redis-cli ping`
- Verify Redis host and port settings

### Authentication Failures
- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure device is registered

## Support

For issues and questions, please refer to the project repository or contact the development team.

## License

MIT
