# NeuroBuildTech Platform API Documentation

## API Gateway
**Base URL:** `http://localhost:3000`

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Users Service API

### GraphQL Endpoint
**URL:** `http://localhost:3010/graphql`

#### Queries
```graphql
# Get all users (protected)
query {
  users {
    id
    email
    firstName
    lastName
    role
    isActive
    createdAt
    updatedAt
    phone
    company
  }
}

# Get single user (protected)
query {
  user(id: "user-id") {
    id
    email
    firstName
    lastName
    role
  }
}

# Health check
query {
  hello
}
```

#### Mutations
```graphql
# Create user (public)
mutation {
  createUser(createUserInput: {
    email: "usuario@example.com"
    firstName: "Juan"
    lastName: "Pérez"
    password: "password123"
    phone: "+1234567890"
    company: "Empresa S.A."
  }) {
    id
    email
    firstName
    lastName
    role
  }
}

# Login (public)
mutation {
  login(loginInput: {
    email: "usuario@example.com"
    password: "password123"
  }) {
    access_token
    user {
      id
      email
      firstName
      lastName
      role
    }
  }
}
```

## Services Service API

### GraphQL Endpoint
**URL:** `http://localhost:3011/graphql`

#### Service Types
- **IA**: Consultoría en inteligencia artificial
- **n8n**: Automatización de procesos
- **IoT**: Dispositivos y sistemas IoT
- **Domótica**: Automatización del hogar

#### Queries
```graphql
# Get all services
query {
  services {
    id
    name
    description
    category
    price
    features
    isActive
  }
}

# Get services by category
query {
  servicesByCategory(category: "IA") {
    id
    name
    description
    price
    features
  }
}
```

#### Mutations
```graphql
# Request service (protected)
mutation {
  requestService(serviceId: "service-id", description: "Descripción del requerimiento") {
    id
    status
    createdAt
  }
}
```

## Consulting Service API

### GraphQL Endpoint
**URL:** `http://localhost:3012/graphql`

#### Ticket Management
```graphql
# Create support ticket (protected)
mutation {
  createTicket(createTicketInput: {
    title: "Consulta sobre IA"
    description: "Necesito ayuda con machine learning"
    category: "IA"
    priority: "MEDIUM"
  }) {
    id
    title
    status
    category
    priority
    createdAt
  }
}

# Get user tickets (protected)
query {
  myTickets {
    id
    title
    status
    category
    priority
    createdAt
    updatedAt
  }
}
```

## AI Service API

### GraphQL Endpoint
**URL:** `http://localhost:3013/graphql`

#### AI Processing
```graphql
# Process AI request (protected)
mutation {
  processAIRequest(aiRequestInput: {
    type: "TEXT_ANALYSIS"
    input: "Texto a analizar"
    modelName: "gpt-3.5-turbo"
  }) {
    id
    result
    confidence
    processingTime
  }
}

# Get AI models
query {
  availableModels {
    name
    description
    type
    isActive
  }
}
```

## n8n Service API

### GraphQL Endpoint
**URL:** `http://localhost:3014/graphql`

#### Workflow Management
```graphql
# Create workflow (protected)
mutation {
  createWorkflow(workflowInput: {
    name: "Email Automation"
    description: "Automatización de correos"
    triggers: ["webhook", "schedule"]
  }) {
    id
    name
    status
    createdAt
  }
}

# Execute workflow (protected)
mutation {
  executeWorkflow(workflowId: "workflow-id", inputData: "{}") {
    executionId
    status
    result
  }
}
```

## IoT Service API

### GraphQL Endpoint
**URL:** `http://localhost:3015/graphql`

#### Device Management
```graphql
# Register device (protected)
mutation {
  registerDevice(deviceInput: {
    name: "Sensor Temperatura"
    type: "TEMPERATURE_SENSOR"
    location: "Sala de estar"
    macAddress: "00:11:22:33:44:55"
  }) {
    id
    name
    type
    status
    lastSeen
  }
}

# Get device data (protected)
query {
  deviceData(deviceId: "device-id", from: "2024-01-01", to: "2024-01-31") {
    timestamp
    value
    unit
    sensorType
  }
}

# Control device (protected)
mutation {
  controlDevice(deviceId: "device-id", command: "turn_on", parameters: "{}") {
    success
    message
    newStatus
  }
}
```

## Payments Service API

### GraphQL Endpoint
**URL:** `http://localhost:3016/graphql`

#### Payment Processing
```graphql
# Create payment preference (protected)
mutation {
  createPaymentPreference(paymentInput: {
    items: [{
      title: "Consultoría IA"
      quantity: 1
      unitPrice: 150.00
    }]
    paymentMethod: "MERCADOPAGO"
  }) {
    id
    initPoint
    status
  }
}

# Get payment status (protected)
query {
  paymentStatus(paymentId: "payment-id") {
    id
    status
    amount
    currency
    createdAt
    paidAt
  }
}
```

## REST API Endpoints

### Health Checks
```
GET /health/users-service
GET /health/services-service
GET /health/consulting-service
GET /health/ai-service
GET /health/n8n-service
GET /health/iot-service
GET /health/payments-service
```

### File Uploads
```
POST /api/upload/avatar
POST /api/upload/documents
POST /api/upload/ai-models
```

## WebSocket Events

### Real-time Notifications
```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
});

// Listen for events
socket.on('ticket_updated', (data) => {
  console.log('Ticket updated:', data);
});

socket.on('device_status_changed', (data) => {
  console.log('Device status:', data);
});

socket.on('workflow_completed', (data) => {
  console.log('Workflow result:', data);
});
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### GraphQL Errors
```json
{
  "errors": [
    {
      "message": "Error message",
      "locations": [{"line": 2, "column": 3}],
      "path": ["field"],
      "extensions": {
        "code": "VALIDATION_ERROR",
        "exception": {
          "stacktrace": ["Error details..."]
        }
      }
    }
  ],
  "data": null
}
```

## Rate Limiting
- **Public endpoints**: 100 requests per minute per IP
- **Authenticated endpoints**: 1000 requests per minute per user
- **AI processing**: 10 requests per minute per user

## Environment Variables

### Backend Services
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=neurobuild
DB_PASSWORD=password
DB_NAME=neurobuildtech

# JWT
JWT_SECRET=neurobuildtech-secret-key
JWT_EXPIRATION=24h

# External Services
OPENAI_API_KEY=your-openai-key
MERCADOPAGO_ACCESS_TOKEN=your-mercadopago-token
STRIPE_SECRET_KEY=your-stripe-key

# Redis
REDIS_URL=redis://localhost:6379

# MQTT (for IoT)
MQTT_BROKER=mqtt://localhost:1883
```