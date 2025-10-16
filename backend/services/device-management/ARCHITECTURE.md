# Device Management Service - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│  (ESP32-S3 Devices, Web Dashboard, Mobile Apps, Admin Portal)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Device Management Service                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Express.js Server                      │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │  Middleware  │  │  Controllers │  │   Routes    │  │    │
│  │  │              │  │              │  │             │  │    │
│  │  │ - Auth       │  │ - Register   │  │ - /devices  │  │    │
│  │  │ - Validation │  │ - Config     │  │ - /health   │  │    │
│  │  │ - CORS       │  │ - Status     │  │ - /api-docs │  │    │
│  │  │ - Helmet     │  │ - Monitor    │  │             │  │    │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬───────┘  │    │
│  │         │                 │                 │          │    │
│  │         └─────────────────┼─────────────────┘          │    │
│  │                           │                            │    │
│  │                  ┌────────▼──────────┐                 │    │
│  │                  │   Business Logic  │                 │    │
│  │                  │                   │                 │    │
│  │                  │ - Device Utils    │                 │    │
│  │                  │ - JWT Utils       │                 │    │
│  │                  │ - Redis Cache     │                 │    │
│  │                  └────────┬──────────┘                 │    │
│  └───────────────────────────┼────────────────────────────┘    │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
      ┌──────────────────┐           ┌──────────────────┐
      │     MongoDB      │           │      Redis       │
      │                  │           │                  │
      │ - Devices        │           │ - Status Cache   │
      │ - Configs        │           │ - Sessions       │
      │ - History        │           │ - Rate Limits    │
      └──────────────────┘           └──────────────────┘
```

## Data Flow

### Device Registration Flow

```
ESP32-S3 Device
      │
      │ POST /api/devices/register
      │ { name, sensors, location }
      ▼
┌──────────────┐
│ Validation   │
│ Middleware   │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌──────────────┐
│   Generate   │      │   Generate   │
│  Device ID   │◄────►│   API Key    │
└──────┬───────┘      └──────────────┘
       │
       ▼
┌──────────────┐
│  Save Device │
│  to MongoDB  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Generate   │
│  JWT Token   │
└──────┬───────┘
       │
       ▼
  Return Response
  {
    deviceId,
    apiKey,
    token
  }
```

### Configuration Update Flow

```
Admin/Device
      │
      │ PUT /api/devices/:id/config
      │ { config: {...} }
      ▼
┌──────────────┐
│ Validation   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Get Current  │
│    Device    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Archive    │
│ Old Config   │
│  (History)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update Config│
│ & Increment  │
│   Version    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Save to DB  │
└──────┬───────┘
       │
       ▼
  Return Updated
   Configuration
```

### Status Update Flow

```
ESP32-S3 Device
      │
      │ PUT /api/devices/:id/status
      │ Authorization: Bearer {token}
      │ { status: "online" }
      ▼
┌──────────────┐
│   Validate   │
│  JWT Token   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update Device│
│   Status     │
│   in MongoDB │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Cache Status│
│   in Redis   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Update     │
│ Connection   │
│   Stats      │
└──────┬───────┘
       │
       ▼
  Return Status
   & Statistics
```

## Component Architecture

### Layer 1: API Layer (Express Routes)
- **Responsibility**: HTTP request/response handling
- **Components**: Route handlers, Swagger documentation
- **Files**: `src/routes/deviceRoutes.ts`

### Layer 2: Middleware Layer
- **Responsibility**: Request validation, authentication, error handling
- **Components**:
  - Authentication middleware (JWT, API Key)
  - Validation middleware (express-validator)
  - Security middleware (CORS, Helmet)
- **Files**: `src/middleware/auth.ts`, `src/middleware/validation.ts`

### Layer 3: Business Logic Layer
- **Responsibility**: Core business logic, data processing
- **Components**:
  - Device registration
  - Configuration management
  - Status monitoring
- **Files**: `src/controllers/deviceController.ts`

### Layer 4: Service Layer
- **Responsibility**: Reusable utilities, external service integration
- **Components**:
  - JWT token management
  - Device ID generation
  - Redis caching
- **Files**: `src/utils/jwt.ts`, `src/utils/deviceUtils.ts`, `src/utils/redis.ts`

### Layer 5: Data Layer
- **Responsibility**: Data persistence, schema definition
- **Components**:
  - Mongoose models
  - Schema validation
  - Database queries
- **Files**: `src/models/Device.ts`

### Layer 6: External Services
- **MongoDB**: Primary data store
- **Redis**: Caching and session management

## Database Schema

### Device Collection

```javascript
{
  _id: ObjectId,
  deviceId: "ESP32-A1B2C3D4",        // Unique identifier
  deviceType: "ESP32-S3",             // Device hardware type
  name: "Living Room Sensor",         // Human-readable name
  description: "Motion detector",     // Optional description
  
  // Location information
  location: {
    name: "Living Room",
    latitude: 40.7128,
    longitude: -74.0060
  },
  
  // Sensor configuration
  sensors: [
    {
      type: "LD2410",
      enabled: true,
      config: { maxDistance: 6 }
    },
    {
      type: "PIR",
      enabled: true,
      config: { timeout: 30 }
    },
    {
      type: "MQ134",
      enabled: true,
      config: { threshold: 100 }
    }
  ],
  
  // Status and monitoring
  status: "online",                   // online, offline, maintenance
  lastSeen: Date,                     // Last activity timestamp
  
  // Connection statistics
  connectionStats: {
    totalConnections: 10,
    lastConnectedAt: Date,
    lastDisconnectedAt: Date,
    uptimeSeconds: 86400
  },
  
  // Security
  apiKey: "hashed-api-key",          // Bcrypt hashed
  
  // Configuration management
  configVersion: 3,                   // Current version
  config: {                          // Current configuration
    samplingRate: 1000,
    reportingInterval: 60000
  },
  configHistory: [                   // Version history
    {
      version: 1,
      config: {...},
      timestamp: Date
    },
    {
      version: 2,
      config: {...},
      timestamp: Date
    }
  ],
  
  // Metadata
  metadata: {                        // Arbitrary metadata
    firmware: "1.0.0",
    hardware: "ESP32-S3-WROOM-1"
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Primary index
{ deviceId: 1 }                    // Unique

// Query optimization indexes
{ status: 1, lastSeen: -1 }        // List active devices
{ 'location.name': 1 }             // Filter by location
{ apiKey: 1 }                      // API key authentication
```

## Security Architecture

### Authentication Flow

```
Device Request
      │
      ▼
┌─────────────────┐
│ Extract Token   │
│ from Header     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify JWT      │
│ Signature       │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    Yes  │  No
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Process │ │ Return   │
│Request │ │ 401      │
└────────┘ └──────────┘
```

### API Key Flow

```
Device Request
      │
      ▼
┌─────────────────┐
│ Extract API Key │
│ from Header     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Device    │
│ by API Key      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │
    Yes  │  No
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Process │ │ Return   │
│Request │ │ 401      │
└────────┘ └──────────┘
```

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- No server-side session storage
- JWT tokens for authentication
- Redis for shared caching

### Database Scaling
- MongoDB sharding support
- Read replicas for queries
- Write concern configuration
- Index optimization

### Caching Strategy
- Redis for hot data (status, sessions)
- TTL-based cache invalidation
- Cache-aside pattern
- Fallback to database when cache unavailable

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────┐
│          Docker Host                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   device-management-service       │ │
│  │   Port: 3000                      │ │
│  └───────────┬───────────────────────┘ │
│              │                          │
│  ┌───────────┴───────────────────────┐ │
│  │                                   │ │
│  │  ┌────────────┐  ┌─────────────┐ │ │
│  │  │  MongoDB   │  │   Redis     │ │ │
│  │  │  Port:     │  │   Port:     │ │ │
│  │  │  27017     │  │   6379      │ │ │
│  │  └────────────┘  └─────────────┘ │ │
│  │                                   │ │
│  │      Docker Network               │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Production Architecture

```
┌────────────────────────────────────────────────┐
│              Load Balancer                     │
│              (nginx/ALB)                       │
└────────┬──────────────┬────────────────────────┘
         │              │
    ┌────▼────┐    ┌────▼────┐
    │ Service │    │ Service │
    │ Node 1  │    │ Node 2  │
    └────┬────┘    └────┬────┘
         │              │
         └──────┬───────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼────┐         ┌────────▼─────┐
│MongoDB │         │  Redis       │
│Cluster │         │  Cluster     │
│        │         │              │
│Primary │         │ Master       │
│Secondary│        │ Replica      │
│Secondary│        │ Replica      │
└────────┘         └──────────────┘
```

## Integration Points

### Data Ingestion Module
```
Data Ingestion Service
        │
        │ Validate Device
        ▼
┌──────────────────┐
│ GET /devices/:id │
└────────┬─────────┘
         │
         ▼
  Device Validated
         │
         ▼
┌──────────────────┐
│ Process Data     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Update Health    │
│ GET /health      │
└──────────────────┘
```

### Event Publishing (Future)
```
Device Event
     │
     ▼
┌──────────────┐
│ Event Broker │
│ (RabbitMQ)   │
└──────┬───────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌────────────┐  ┌────────────┐
│ Analytics  │  │  Alerts    │
│  Service   │  │  Service   │
└────────────┘  └────────────┘
```

## Monitoring & Observability

### Health Checks
- `/api/health` - Service health
- MongoDB connection status
- Redis connection status

### Metrics (To Implement)
- Request rate
- Response time
- Error rate
- Active devices
- Database queries
- Cache hit/miss ratio

### Logging
- Morgan HTTP logging
- Console.error for errors
- Structured logging (to implement)

## Performance Characteristics

### Expected Performance
- Registration: < 500ms
- Status Update: < 100ms (with cache)
- Device Query: < 50ms (with cache)
- Config Update: < 200ms
- Bulk Operations: ~100ms per device

### Optimization Strategies
1. Redis caching for status
2. Database indexes
3. Connection pooling
4. Async operations
5. Pagination for lists

## Summary

This architecture provides:
- ✅ Scalable and maintainable design
- ✅ Clear separation of concerns
- ✅ Security best practices
- ✅ Performance optimization
- ✅ Production-ready structure
- ✅ Easy integration points
- ✅ Comprehensive monitoring capabilities
