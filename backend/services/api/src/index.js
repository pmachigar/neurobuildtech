const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const devicesRouter = require('./routes/devices');
const dataRouter = require('./routes/data');
const healthRouter = require('./routes/health');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Performance middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// API Documentation
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/openapi.yaml');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rate limiting
app.use('/api/', rateLimitMiddleware);

// Public routes (no auth required)
app.use('/api/v1/health', healthRouter);

// Protected routes
app.use('/api/v1/devices', authMiddleware, devicesRouter);
app.use('/api/v1/data', authMiddleware, dataRouter);

// Health metrics and status (protected)
const healthController = require('./controllers/healthController');
app.get('/api/v1/metrics', authMiddleware, healthController.getMetrics);
app.get('/api/v1/status', authMiddleware, healthController.getSystemStatus);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 NeuroBuildTech API Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api/docs`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
