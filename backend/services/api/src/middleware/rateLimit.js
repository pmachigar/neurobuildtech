const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// Redis configuration for distributed rate limiting
const redisClient = process.env.REDIS_URL 
  ? redis.createClient({ url: process.env.REDIS_URL })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.connect().catch(console.error);
}

/**
 * Default rate limiter for general API endpoints
 */
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  // Use Redis store if available for distributed systems
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:default:'
  }) : undefined,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  }
});

/**
 * Strict rate limiter for sensitive operations (login, registration)
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:strict:'
  }) : undefined
});

/**
 * Device rate limiter for IoT device data submission
 */
const deviceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each device to 60 requests per minute (1 per second)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'DEVICE_RATE_LIMIT_EXCEEDED',
      message: 'Device is sending data too frequently. Maximum 60 requests per minute.'
    }
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:device:'
  }) : undefined,
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  }
});

/**
 * Query rate limiter for data-intensive endpoints
 */
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'QUERY_RATE_LIMIT_EXCEEDED',
      message: 'Too many data queries. Please slow down your requests.'
    }
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:query:'
  }) : undefined
});

module.exports = defaultLimiter;
module.exports.strictLimiter = strictLimiter;
module.exports.deviceLimiter = deviceLimiter;
module.exports.queryLimiter = queryLimiter;
module.exports.redisClient = redisClient;
