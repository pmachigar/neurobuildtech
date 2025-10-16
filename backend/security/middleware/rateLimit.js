/**
 * Rate Limiting Middleware
 * Implements API rate limiting and DDoS protection
 */

const crypto = require('crypto');

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = options.maxRequests || 100;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.handler = options.handler || this.defaultHandler;
    this.store = new Map();
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.windowMs);
  }
  
  defaultKeyGenerator(req) {
    // Generate key based on IP address and user ID (if authenticated)
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }
  
  defaultHandler(req, res) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(this.windowMs / 1000)
    });
  }
  
  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = this.store.get(key);
      
      if (!entry) {
        entry = {
          count: 0,
          resetTime: now + this.windowMs
        };
        this.store.set(key, entry);
      }
      
      // Reset counter if window has passed
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + this.windowMs;
      }
      
      // Increment request count
      entry.count++;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      
      // Check if rate limit exceeded
      if (entry.count > this.maxRequests) {
        return this.handler(req, res);
      }
      
      // Handle skip options
      if (this.skipSuccessfulRequests || this.skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          const statusCode = res.statusCode;
          
          if ((statusCode >= 200 && statusCode < 300 && this.skipSuccessfulRequests) ||
              (statusCode >= 400 && this.skipFailedRequests)) {
            entry.count--;
          }
          
          return originalSend.call(this, data);
        }.bind(this);
      }
      
      next();
    };
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime + this.windowMs) {
        this.store.delete(key);
      }
    }
  }
  
  reset(key) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

/**
 * Sliding window rate limiter (more accurate)
 */
class SlidingWindowRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.maxRequests = options.maxRequests || 100;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.store = new Map();
    
    setInterval(() => this.cleanup(), this.windowMs);
  }
  
  defaultKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }
  
  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      // Get or create request log
      let requests = this.store.get(key);
      
      if (!requests) {
        requests = [];
        this.store.set(key, requests);
      }
      
      // Remove old requests outside the window
      requests = requests.filter(timestamp => timestamp > windowStart);
      this.store.set(key, requests);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - requests.length));
      res.setHeader('X-RateLimit-Reset', new Date(now + this.windowMs).toISOString());
      
      // Check if rate limit exceeded
      if (requests.length >= this.maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      // Add current request
      requests.push(now);
      
      next();
    };
  }
  
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs * 2;
    
    for (const [key, requests] of this.store.entries()) {
      const filtered = requests.filter(timestamp => timestamp > windowStart);
      
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }
}

/**
 * DDoS protection middleware
 */
class DDoSProtection {
  constructor(options = {}) {
    this.threshold = options.threshold || 1000; // requests per minute
    this.blockDuration = options.blockDuration || 60 * 60 * 1000; // 1 hour
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute
    this.blockedIPs = new Map();
    this.requestCounts = new Map();
    
    setInterval(() => this.cleanup(), this.windowMs);
  }
  
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      // Check if IP is blocked
      const blockInfo = this.blockedIPs.get(ip);
      if (blockInfo && now < blockInfo.until) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'IP address temporarily blocked due to suspicious activity',
          unblockAt: new Date(blockInfo.until).toISOString()
        });
      }
      
      // Remove expired blocks
      if (blockInfo && now >= blockInfo.until) {
        this.blockedIPs.delete(ip);
      }
      
      // Track request count
      let entry = this.requestCounts.get(ip);
      
      if (!entry) {
        entry = {
          count: 0,
          windowStart: now
        };
        this.requestCounts.set(ip, entry);
      }
      
      // Reset counter if window has passed
      if (now - entry.windowStart > this.windowMs) {
        entry.count = 0;
        entry.windowStart = now;
      }
      
      entry.count++;
      
      // Check if threshold exceeded
      if (entry.count > this.threshold) {
        this.blockedIPs.set(ip, {
          until: now + this.blockDuration,
          reason: 'DDoS protection triggered'
        });
        
        console.warn(`IP ${ip} blocked due to excessive requests: ${entry.count} in ${this.windowMs}ms`);
        
        return res.status(403).json({
          error: 'Forbidden',
          message: 'IP address blocked due to excessive requests'
        });
      }
      
      next();
    };
  }
  
  cleanup() {
    const now = Date.now();
    
    // Clean up old request counts
    for (const [ip, entry] of this.requestCounts.entries()) {
      if (now - entry.windowStart > this.windowMs * 2) {
        this.requestCounts.delete(ip);
      }
    }
    
    // Clean up expired blocks
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      if (now >= blockInfo.until) {
        this.blockedIPs.delete(ip);
      }
    }
  }
  
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
  }
}

/**
 * Concurrent request limiter
 */
class ConcurrentRequestLimiter {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 10;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.activeCounts = new Map();
  }
  
  defaultKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress;
    return ip;
  }
  
  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const currentCount = this.activeCounts.get(key) || 0;
      
      if (currentCount >= this.maxConcurrent) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Too many concurrent requests'
        });
      }
      
      // Increment active count
      this.activeCounts.set(key, currentCount + 1);
      
      // Decrement on response finish
      res.on('finish', () => {
        const count = this.activeCounts.get(key) || 1;
        if (count <= 1) {
          this.activeCounts.delete(key);
        } else {
          this.activeCounts.set(key, count - 1);
        }
      });
      
      next();
    };
  }
}

/**
 * Preset rate limit configurations
 */
const rateLimitPresets = {
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50
  },
  moderate: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },
  relaxed: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5 // Strict limit for auth endpoints
  }
};

/**
 * Create rate limiter with preset
 */
function createRateLimiter(preset = 'moderate', customOptions = {}) {
  const options = {
    ...rateLimitPresets[preset],
    ...customOptions
  };
  
  return new RateLimiter(options);
}

module.exports = {
  RateLimiter,
  SlidingWindowRateLimiter,
  DDoSProtection,
  ConcurrentRequestLimiter,
  rateLimitPresets,
  createRateLimiter
};
