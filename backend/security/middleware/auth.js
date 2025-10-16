/**
 * Authentication Middleware
 * Implements JWT token-based authentication, OAuth2/OIDC integration, and RBAC
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// User roles with permissions
const ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: ['*'] // Full access
  },
  USER: {
    name: 'user',
    permissions: ['read', 'device:manage']
  },
  DEVICE: {
    name: 'device',
    permissions: ['data:submit']
  }
};

// Configuration (should be loaded from environment variables)
const config = {
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  oauth2Enabled: process.env.OAUTH2_ENABLED === 'true',
  oauth2Provider: process.env.OAUTH2_PROVIDER || 'keycloak',
  oauth2ClientId: process.env.OAUTH2_CLIENT_ID,
  oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,
  oauth2IssuerUrl: process.env.OAUTH2_ISSUER_URL
};

// Token blacklist for revoked tokens (in production, use Redis or database)
const tokenBlacklist = new Set();

/**
 * Generate JWT access token
 */
function generateAccessToken(userId, role, metadata = {}) {
  const payload = {
    sub: userId,
    role: role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    ...metadata
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'neurobuildtech',
    audience: 'neurobuildtech-api'
  });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId, role) {
  const payload = {
    sub: userId,
    role: role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
    issuer: 'neurobuildtech',
    audience: 'neurobuildtech-api'
  });
}

/**
 * Generate API key for service-to-service authentication
 */
function generateApiKey(service, metadata = {}) {
  const key = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  return {
    key: key,
    hash: hash,
    service: service,
    created: new Date().toISOString(),
    ...metadata
  };
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }
    
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'neurobuildtech',
      audience: 'neurobuildtech-api'
    });
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Revoke token (add to blacklist)
 */
function revokeToken(token) {
  tokenBlacklist.add(token);
}

/**
 * Authentication middleware
 */
function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Check token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type'
      });
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      permissions: ROLES[decoded.role.toUpperCase()]?.permissions || []
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
}

/**
 * API Key authentication middleware
 */
function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API key'
      });
    }
    
    // Verify API key (in production, check against database)
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // This is a simplified check - in production, query database
    // For now, we'll accept any key and log it
    console.log('API Key hash:', hash);
    
    req.apiKey = {
      hash: hash,
      service: 'external-service'
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
}

/**
 * Role-based access control (RBAC) middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role.toUpperCase();
    
    // Admin has access to everything
    if (userRole === 'ADMIN') {
      return next();
    }
    
    // Check if user role is in allowed roles
    const hasAccess = allowedRoles.some(role => 
      role.toUpperCase() === userRole
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
}

/**
 * Permission-based access control middleware
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    const userPermissions = req.user.permissions;
    
    // Check for wildcard permission (admin)
    if (userPermissions.includes('*')) {
      return next();
    }
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
}

/**
 * Refresh token endpoint handler
 */
function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token required'
      });
    }
    
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid token type'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.sub, decoded.role);
    
    res.json({
      accessToken: newAccessToken,
      expiresIn: config.jwtExpiresIn
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
}

/**
 * OAuth2/OIDC integration (placeholder for full implementation)
 */
async function oauth2Callback(req, res) {
  // This is a placeholder for OAuth2 callback handling
  // Full implementation would integrate with OAuth2 provider (Keycloak, Auth0, etc.)
  
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code required'
      });
    }
    
    // In production, exchange code for tokens with OAuth2 provider
    // For now, return placeholder response
    
    res.json({
      message: 'OAuth2 callback received',
      note: 'Full OAuth2 integration requires provider configuration'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Session management
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }
  
  createSession(userId, metadata = {}) {
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const session = {
      id: sessionId,
      userId: userId,
      created: Date.now(),
      lastAccess: Date.now(),
      ...metadata
    };
    
    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId);
    
    return sessionId;
  }
  
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session expired
    if (Date.now() - session.lastAccess > this.sessionTimeout) {
      this.destroySession(sessionId);
      return null;
    }
    
    // Update last access time
    session.lastAccess = Date.now();
    
    return session;
  }
  
  destroySession(sessionId) {
    this.sessions.delete(sessionId);
  }
  
  scheduleCleanup(sessionId) {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && Date.now() - session.lastAccess > this.sessionTimeout) {
        this.destroySession(sessionId);
      }
    }, this.sessionTimeout);
  }
}

const sessionManager = new SessionManager();

module.exports = {
  ROLES,
  generateAccessToken,
  generateRefreshToken,
  generateApiKey,
  verifyToken,
  revokeToken,
  authenticate,
  authenticateApiKey,
  authorize,
  requirePermission,
  refreshToken,
  oauth2Callback,
  sessionManager
};
