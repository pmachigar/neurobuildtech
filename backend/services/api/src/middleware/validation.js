/**
 * Generic validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: errors
        }
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach(key => {
        value[key] = sanitizeValue(value[key]);
      });
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAGE',
        message: 'Page number must be greater than 0'
      }
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100'
      }
    });
  }

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};

/**
 * Validate date range parameters
 */
const validateDateRange = (req, res, next) => {
  const { start_time, end_time } = req.query;

  if (start_time) {
    const startDate = new Date(start_time);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_START_TIME',
          message: 'Invalid start_time format. Use ISO 8601 format.'
        }
      });
    }
    req.query.start_time = startDate;
  }

  if (end_time) {
    const endDate = new Date(end_time);
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_END_TIME',
          message: 'Invalid end_time format. Use ISO 8601 format.'
        }
      });
    }
    req.query.end_time = endDate;
  }

  if (start_time && end_time && req.query.start_time > req.query.end_time) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATE_RANGE',
        message: 'start_time must be before end_time'
      }
    });
  }

  next();
};

module.exports = {
  validate,
  sanitizeInput,
  validatePagination,
  validateDateRange
};
