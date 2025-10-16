/**
 * Input Validation and Sanitization Middleware
 * Implements schema validation, SQL injection prevention, XSS protection, and CSRF protection
 */

const crypto = require('crypto');

/**
 * Schema validator
 */
class SchemaValidator {
  /**
   * Validate data against schema
   */
  static validate(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} is required`
        });
        continue;
      }
      
      // Skip validation if field is not required and not present
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Type validation
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push({
            field,
            message: `${field} must be of type ${rules.type}`
          });
          continue;
        }
      }
      
      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.minLength} characters`
          });
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({
            field,
            message: `${field} must not exceed ${rules.maxLength} characters`
          });
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({
            field,
            message: `${field} has invalid format`
          });
        }
        
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} must be one of: ${rules.enum.join(', ')}`
          });
        }
      }
      
      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.min}`
          });
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push({
            field,
            message: `${field} must not exceed ${rules.max}`
          });
        }
        
        if (rules.integer && !Number.isInteger(value)) {
          errors.push({
            field,
            message: `${field} must be an integer`
          });
        }
      }
      
      // Array validations
      if (rules.type === 'array') {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push({
            field,
            message: `${field} must have at least ${rules.minItems} items`
          });
        }
        
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push({
            field,
            message: `${field} must not have more than ${rules.maxItems} items`
          });
        }
        
        if (rules.items) {
          value.forEach((item, index) => {
            const itemErrors = this.validate({ item }, { item: rules.items });
            itemErrors.forEach(err => {
              errors.push({
                field: `${field}[${index}]`,
                message: err.message
              });
            });
          });
        }
      }
      
      // Custom validator
      if (rules.validator) {
        const result = rules.validator(value, data);
        if (result !== true) {
          errors.push({
            field,
            message: result || `${field} is invalid`
          });
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Create validation middleware
   */
  static middleware(schema, options = {}) {
    return (req, res, next) => {
      const dataToValidate = options.body ? req.body : 
                            options.query ? req.query :
                            options.params ? req.params :
                            { ...req.body, ...req.query, ...req.params };
      
      const errors = this.validate(dataToValidate, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: errors
        });
      }
      
      next();
    };
  }
}

/**
 * SQL Injection Prevention
 */
class SQLInjectionProtection {
  static sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\;|\/\*|\*\/|xp_|sp_)/gi,
    /('|('')|;|--|\/\*|\*\/|\bOR\b|\bAND\b)/gi
  ];
  
  /**
   * Check if string contains SQL injection patterns
   */
  static containsSQLInjection(input) {
    if (typeof input !== 'string') {
      return false;
    }
    
    return this.sqlInjectionPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Sanitize string to prevent SQL injection
   */
  static sanitize(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Escape single quotes
    return input.replace(/'/g, "''");
  }
  
  /**
   * Middleware to detect SQL injection attempts
   */
  static middleware() {
    return (req, res, next) => {
      const checkObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string' && this.containsSQLInjection(value)) {
            return {
              detected: true,
              field: currentPath,
              value: value
            };
          }
          
          if (typeof value === 'object' && value !== null) {
            const result = checkObject(value, currentPath);
            if (result.detected) {
              return result;
            }
          }
        }
        
        return { detected: false };
      };
      
      // Check body, query, and params
      const bodyCheck = checkObject(req.body || {}, 'body');
      if (bodyCheck.detected) {
        console.warn(`SQL injection attempt detected in ${bodyCheck.field}:`, bodyCheck.value);
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid input detected'
        });
      }
      
      const queryCheck = checkObject(req.query || {}, 'query');
      if (queryCheck.detected) {
        console.warn(`SQL injection attempt detected in ${queryCheck.field}:`, queryCheck.value);
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid input detected'
        });
      }
      
      next();
    };
  }
}

/**
 * XSS Protection
 */
class XSSProtection {
  static xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<embed/gi,
    /<object/gi
  ];
  
  /**
   * Check if string contains XSS patterns
   */
  static containsXSS(input) {
    if (typeof input !== 'string') {
      return false;
    }
    
    return this.xssPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Sanitize string to prevent XSS
   */
  static sanitize(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Middleware to detect XSS attempts
   */
  static middleware() {
    return (req, res, next) => {
      const checkObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string' && this.containsXSS(value)) {
            return {
              detected: true,
              field: currentPath,
              value: value
            };
          }
          
          if (typeof value === 'object' && value !== null) {
            const result = checkObject(value, currentPath);
            if (result.detected) {
              return result;
            }
          }
        }
        
        return { detected: false };
      };
      
      const bodyCheck = checkObject(req.body || {}, 'body');
      if (bodyCheck.detected) {
        console.warn(`XSS attempt detected in ${bodyCheck.field}:`, bodyCheck.value);
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid input detected'
        });
      }
      
      next();
    };
  }
}

/**
 * CSRF Protection
 */
class CSRFProtection {
  constructor(options = {}) {
    this.secret = options.secret || crypto.randomBytes(32).toString('hex');
    this.tokenLength = options.tokenLength || 32;
    this.cookieName = options.cookieName || '_csrf';
    this.headerName = options.headerName || 'x-csrf-token';
    this.ignoreMethods = options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS'];
  }
  
  /**
   * Generate CSRF token
   */
  generateToken(sessionId) {
    const token = crypto.randomBytes(this.tokenLength).toString('hex');
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(`${sessionId}:${token}`)
      .digest('hex');
    
    return `${token}.${hash}`;
  }
  
  /**
   * Verify CSRF token
   */
  verifyToken(token, sessionId) {
    if (!token || !sessionId) {
      return false;
    }
    
    const [tokenPart, hashPart] = token.split('.');
    
    if (!tokenPart || !hashPart) {
      return false;
    }
    
    const expectedHash = crypto
      .createHmac('sha256', this.secret)
      .update(`${sessionId}:${tokenPart}`)
      .digest('hex');
    
    return hashPart === expectedHash;
  }
  
  /**
   * Middleware to protect against CSRF
   */
  middleware() {
    return (req, res, next) => {
      // Skip for safe methods
      if (this.ignoreMethods.includes(req.method)) {
        return next();
      }
      
      // Get session ID (from cookie or session)
      const sessionId = req.session?.id || req.cookies?.sessionId;
      
      if (!sessionId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Session required'
        });
      }
      
      // Get token from header or body
      const token = req.headers[this.headerName] || req.body?._csrf;
      
      if (!token) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token required'
        });
      }
      
      // Verify token
      if (!this.verifyToken(token, sessionId)) {
        console.warn('CSRF token validation failed');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid CSRF token'
        });
      }
      
      next();
    };
  }
  
  /**
   * Middleware to provide CSRF token
   */
  tokenProvider() {
    return (req, res, next) => {
      const sessionId = req.session?.id || req.cookies?.sessionId;
      
      if (sessionId) {
        const token = this.generateToken(sessionId);
        res.locals.csrfToken = token;
        res.cookie(this.cookieName, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
      }
      
      next();
    };
  }
}

/**
 * Security Headers Middleware
 */
class SecurityHeaders {
  static middleware(options = {}) {
    const defaultOptions = {
      hsts: true,
      noSniff: true,
      xssFilter: true,
      frameOptions: 'DENY',
      contentSecurityPolicy: true,
      referrerPolicy: 'strict-origin-when-cross-origin'
    };
    
    const config = { ...defaultOptions, ...options };
    
    return (req, res, next) => {
      // HTTP Strict Transport Security
      if (config.hsts) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      // X-Content-Type-Options
      if (config.noSniff) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      
      // X-XSS-Protection
      if (config.xssFilter) {
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }
      
      // X-Frame-Options
      if (config.frameOptions) {
        res.setHeader('X-Frame-Options', config.frameOptions);
      }
      
      // Content-Security-Policy
      if (config.contentSecurityPolicy) {
        const csp = typeof config.contentSecurityPolicy === 'string' 
          ? config.contentSecurityPolicy
          : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";
        res.setHeader('Content-Security-Policy', csp);
      }
      
      // Referrer-Policy
      if (config.referrerPolicy) {
        res.setHeader('Referrer-Policy', config.referrerPolicy);
      }
      
      // Permissions-Policy
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // X-Permitted-Cross-Domain-Policies
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      
      next();
    };
  }
}

module.exports = {
  SchemaValidator,
  SQLInjectionProtection,
  XSSProtection,
  CSRFProtection,
  SecurityHeaders
};
