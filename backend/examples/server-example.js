/**
 * Example Express.js Server with Security Middleware
 * 
 * This example demonstrates how to integrate all security components:
 * - Authentication (JWT)
 * - Authorization (RBAC)
 * - Rate limiting
 * - DDoS protection
 * - Input validation
 * - Security headers
 * - Audit logging
 */

const express = require('express');

// Import security middleware
const {
  authenticate,
  authenticateApiKey,
  authorize,
  requirePermission,
  generateAccessToken,
  generateRefreshToken,
  refreshToken
} = require('../security/middleware/auth');

const {
  createRateLimiter,
  DDoSProtection,
  ConcurrentRequestLimiter
} = require('../security/middleware/rateLimit');

const {
  SchemaValidator,
  SQLInjectionProtection,
  XSSProtection,
  SecurityHeaders
} = require('../security/middleware/validation');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Apply security headers
app.use(SecurityHeaders.middleware());

// Apply DDoS protection
const ddos = new DDoSProtection();
app.use(ddos.middleware());

// Apply input sanitization
app.use(SQLInjectionProtection.middleware());
app.use(XSSProtection.middleware());

// Apply rate limiting
const generalLimiter = createRateLimiter('moderate');
app.use('/api', generalLimiter.middleware());

const authLimiter = createRateLimiter('auth');
app.use('/api/auth', authLimiter.middleware());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Dummy authentication
  if (username === 'admin' && password === 'AdminPassword123!') {
    const accessToken = generateAccessToken('admin-001', 'admin');
    const refreshTokenValue = generateRefreshToken('admin-001', 'admin');
    
    return res.json({
      accessToken,
      refreshToken: refreshTokenValue,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: { id: 'admin-001', username: 'admin', role: 'admin' }
    });
  }
  
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
});

// Protected route - requires authentication
app.get('/api/devices', authenticate, (req, res) => {
  const devices = [
    { id: 'device-001', name: 'Sensor 1', status: 'online' },
    { id: 'device-002', name: 'Sensor 2', status: 'offline' }
  ];
  res.json({ devices });
});

// Admin-only route
app.get('/api/admin/users', authenticate, authorize('admin'), (req, res) => {
  const users = [
    { id: 'user-001', username: 'user1', role: 'user' },
    { id: 'admin-001', username: 'admin', role: 'admin' }
  ];
  res.json({ users });
});

// Device telemetry (API key auth)
app.post('/api/devices/:deviceId/telemetry', authenticateApiKey, (req, res) => {
  res.status(202).json({ message: 'Telemetry received' });
});

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Security Demo Server running on port ${PORT}`);
    console.log(`Test: curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"AdminPassword123!"}'`);
  });
}

module.exports = app;
