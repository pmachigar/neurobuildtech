# NeuroBuildTech API Service

Secure RESTful API for IoT device management and sensor data access.

## Features

- **Device Management**: Complete CRUD operations for IoT devices
- **Sensor Data**: Query, aggregate, and submit sensor readings
- **Authentication**: JWT tokens for users, API keys for devices
- **Security**: Rate limiting, input validation, CORS, SQL injection prevention
- **Documentation**: Interactive Swagger UI
- **Performance**: Redis caching, query optimization, compression

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Redis (optional, for distributed rate limiting)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

The API will be available at `http://localhost:3000` (or your configured PORT).

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI Spec**: `/backend/services/api/docs/openapi.yaml`

## Authentication

### JWT Authentication (Users & Admins)

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/devices
```

### API Key Authentication (Devices)

```bash
curl -H "x-api-key: DEVICE_xxxxx" \
  http://localhost:3000/api/v1/devices/123/status
```

## API Endpoints

### Device Management

- `GET /api/v1/devices` - List all devices with filtering and pagination
- `POST /api/v1/devices` - Register new device (admin only)
- `GET /api/v1/devices/:id` - Get device details
- `PUT /api/v1/devices/:id` - Update device configuration (admin only)
- `DELETE /api/v1/devices/:id` - Deactivate device (admin only)
- `GET /api/v1/devices/:id/status` - Get device status and health
- `POST /api/v1/devices/bulk` - Bulk device operations (admin only)

### Sensor Data

- `GET /api/v1/data/sensors` - Query sensor data with filters
- `GET /api/v1/data/devices/:id` - Get all sensor data for a device
- `GET /api/v1/data/sensors/:type` - Get data by sensor type (ld2410, pir, mq134)
- `GET /api/v1/data/aggregated` - Get aggregated data (hourly, daily averages)
- `GET /api/v1/data/latest` - Get latest readings from all devices
- `POST /api/v1/data/submit` - Submit sensor data (devices only)

### System Health

- `GET /api/v1/health` - Service health check (no auth required)
- `GET /api/v1/metrics` - System metrics
- `GET /api/v1/status` - Detailed system status (admin only)

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Devices**: 60 requests per minute
- **Queries**: 30 requests per minute
- **Auth endpoints**: 5 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time until limit resets

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "unique-request-id"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Joi schema validation
- **Sanitization**: XSS and injection prevention
- **Rate Limiting**: Express-rate-limit with Redis
- **JWT**: Secure token-based authentication
- **API Keys**: Device authentication
- **RBAC**: Role-based access control

## Example Usage

### Register a Device

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Sensor Hub",
    "type": "sensor_hub",
    "location": {
      "building": "Main Building",
      "floor": "2",
      "room": "Conference Room A"
    },
    "sensors": [
      {
        "type": "ld2410",
        "model": "LD2410C"
      },
      {
        "type": "pir",
        "model": "HC-SR501"
      }
    ]
  }'
```

### Submit Sensor Data

```bash
curl -X POST http://localhost:3000/api/v1/data/submit \
  -H "x-api-key: DEVICE_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "device-uuid",
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
curl "http://localhost:3000/api/v1/data/sensors?device_id=device-uuid&start_time=2025-01-01T00:00:00Z&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

### Project Structure

```
backend/services/api/
├── src/
│   ├── routes/          # Route definitions
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, validation, rate limiting
│   ├── schemas/         # Joi validation schemas
│   └── utils/           # Helper functions
├── tests/               # Test files
├── docs/                # API documentation
│   └── openapi.yaml     # OpenAPI specification
├── package.json
└── README.md
```

### Adding New Endpoints

1. Define schema in `src/schemas/`
2. Create controller in `src/controllers/`
3. Add route in `src/routes/`
4. Update OpenAPI spec in `docs/openapi.yaml`
5. Add tests in `tests/`

## Production Deployment

### Using Docker

```bash
docker build -t neurobuildtech-api .
docker run -p 3000:3000 --env-file .env neurobuildtech-api
```

### Environment Variables

Ensure all required environment variables are set in production:

- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure `CORS_ORIGIN` appropriately
- Set up Redis for distributed rate limiting
- Configure database connection

## Support

For issues and questions:
- Email: support@neurobuildtech.com
- Documentation: http://localhost:3000/api/docs

## License

MIT
