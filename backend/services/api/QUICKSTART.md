# NeuroBuildTech API - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies

```bash
cd backend/services/api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

The API will be running at http://localhost:3000

### 4. Access API Documentation

Open your browser and visit:
- **Swagger UI**: http://localhost:3000/api/docs

## 📝 Quick API Test

### Generate an Admin Token

```bash
node -e "const jwt = require('jsonwebtoken'); const token = jwt.sign({ userId: 'admin-1', role: 'admin' }, 'your-secret-key-change-in-production', { expiresIn: '24h' }); console.log(token);"
```

Save this token, you'll use it for API calls.

### Test the Health Endpoint (No Auth)

```bash
curl http://localhost:3000/api/v1/health
```

### Register a Device (Admin Only)

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Sensor",
    "type": "sensor_hub",
    "location": {
      "building": "Main Office",
      "floor": "1",
      "room": "Room 101"
    },
    "sensors": [
      {
        "type": "ld2410",
        "model": "LD2410C"
      }
    ]
  }'
```

**Save the `device_id` and `api_key` from the response!**

### Submit Sensor Data (Device)

```bash
curl -X POST http://localhost:3000/api/v1/data/submit \
  -H "x-api-key: YOUR_DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "YOUR_DEVICE_UUID",
    "readings": [
      {
        "sensor_type": "ld2410",
        "values": {
          "presence": true,
          "moving_distance": 150,
          "static_distance": 120,
          "moving_energy": 55,
          "static_energy": 42
        }
      }
    ]
  }'
```

### Query Sensor Data

```bash
curl http://localhost:3000/api/v1/data/latest \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔑 Authentication Methods

### 1. JWT Token (Users & Admins)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/v1/devices
```

### 2. API Key (Devices)
```bash
curl -H "x-api-key: DEVICE_xxxxx" http://localhost:3000/api/v1/devices/123/status
```

## 📊 Available Endpoints

### Device Management
- `GET /api/v1/devices` - List devices
- `POST /api/v1/devices` - Register device (admin)
- `GET /api/v1/devices/:id` - Get device details
- `PUT /api/v1/devices/:id` - Update device (admin)
- `DELETE /api/v1/devices/:id` - Deactivate device (admin)
- `GET /api/v1/devices/:id/status` - Device health status

### Sensor Data
- `GET /api/v1/data/sensors` - Query sensor data
- `GET /api/v1/data/latest` - Latest readings
- `POST /api/v1/data/submit` - Submit data (devices)
- `GET /api/v1/data/devices/:id` - Device data
- `GET /api/v1/data/sensors/:type` - Data by sensor type

### System
- `GET /api/v1/health` - Health check (no auth)
- `GET /api/v1/metrics` - System metrics
- `GET /api/v1/status` - System status (admin)

## 🧪 Run Tests

```bash
npm test
```

## 📚 More Information

See [README.md](./README.md) for comprehensive documentation.
