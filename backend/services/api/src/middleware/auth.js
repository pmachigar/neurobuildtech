const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_KEY_PREFIX = 'DEVICE_';

/**
 * Authentication middleware that supports both JWT tokens and API keys
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header or API key
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (!authHeader && !apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Provide a valid JWT token or API key.'
        }
      });
    }

    // API Key authentication (for devices)
    if (apiKey) {
      if (apiKey.startsWith(API_KEY_PREFIX)) {
        // In production, validate against database
        req.user = {
          id: apiKey,
          role: 'device',
          type: 'api_key'
        };
        return next();
      } else {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key format'
          }
        });
      }
    }

    // JWT authentication
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          id: decoded.userId || decoded.id,
          role: decoded.role || 'user',
          type: 'jwt'
        };
        next();
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Token has expired. Please refresh your token.'
            }
          });
        }
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token'
          }
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred'
      }
    });
  }
};

/**
 * Role-based access control middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource'
        }
      });
    }

    next();
  };
};

/**
 * Generate JWT token
 */
const generateToken = (userId, role = 'user', expiresIn = '24h') => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Refresh token endpoint logic
 */
const refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required'
      }
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const newToken = generateToken(decoded.userId, decoded.role);
    
    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: '24h'
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      }
    });
  }
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.generateToken = generateToken;
module.exports.refreshToken = refreshToken;
