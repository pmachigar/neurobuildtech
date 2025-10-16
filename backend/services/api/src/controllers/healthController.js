const { asyncHandler } = require('../middleware/errorHandler');
const { redisClient } = require('../middleware/rateLimit');

/**
 * Service health check
 */
const healthCheck = asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || '1.0.0'
  };

  // Check Redis connection if available
  if (redisClient) {
    try {
      await redisClient.ping();
      healthStatus.redis = 'connected';
    } catch (error) {
      healthStatus.redis = 'disconnected';
      healthStatus.status = 'degraded';
    }
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: true,
    data: healthStatus
  });
});

/**
 * Get system metrics
 */
const getMetrics = asyncHandler(async (req, res) => {
  // In production, these would come from monitoring systems
  const metrics = {
    timestamp: new Date().toISOString(),
    devices: {
      total: 0,
      online: 0,
      offline: 0,
      inactive: 0
    },
    data: {
      total_readings: 0,
      readings_last_hour: 0,
      readings_last_24h: 0,
      data_rate_per_minute: 0
    },
    system: {
      memory_usage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      cpu_usage: process.cpuUsage(),
      uptime_seconds: Math.floor(process.uptime())
    },
    api: {
      requests_total: 0,
      requests_per_minute: 0,
      average_response_time_ms: 0,
      error_rate: 0
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * Get detailed system status
 */
const getSystemStatus = asyncHandler(async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'running',
        uptime: process.uptime(),
        version: process.env.API_VERSION || '1.0.0'
      },
      database: {
        status: 'not_configured',
        message: 'Using in-memory storage'
      },
      redis: {
        status: 'not_connected',
        message: 'Redis not configured'
      }
    },
    resources: {
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      },
      cpu: process.cpuUsage()
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development'
    }
  };

  // Check Redis if available
  if (redisClient) {
    try {
      await redisClient.ping();
      status.services.redis.status = 'connected';
      status.services.redis.message = 'Redis connection healthy';
    } catch (error) {
      status.services.redis.status = 'error';
      status.services.redis.message = error.message;
    }
  }

  res.json({
    success: true,
    data: status
  });
});

module.exports = {
  healthCheck,
  getMetrics,
  getSystemStatus
};
