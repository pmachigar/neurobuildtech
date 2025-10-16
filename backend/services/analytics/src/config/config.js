/**
 * Configuration Management
 * Handles service configuration with defaults and environment overrides
 */

require('dotenv').config();

class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment and defaults
   * @returns {Object}
   */
  loadConfig() {
    return {
      service: {
        name: process.env.SERVICE_NAME || 'analytics-service',
        port: parseInt(process.env.PORT || '3000'),
        environment: process.env.NODE_ENV || 'development'
      },

      mqtt: {
        enabled: process.env.MQTT_ENABLED === 'true',
        host: process.env.MQTT_HOST || 'localhost',
        port: parseInt(process.env.MQTT_PORT || '1883'),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        topics: (process.env.MQTT_TOPICS || 'sensors/#').split(',')
      },

      redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        stream: process.env.REDIS_STREAM || 'sensor-events'
      },

      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT || '587'),
        smtp_secure: process.env.SMTP_SECURE === 'true',
        smtp_user: process.env.SMTP_USER,
        smtp_pass: process.env.SMTP_PASS,
        from_address: process.env.EMAIL_FROM || 'alerts@neurobuildtech.com',
        recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
      },

      sms: {
        enabled: process.env.SMS_ENABLED === 'true',
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
        recipients: (process.env.SMS_RECIPIENTS || '').split(',').filter(Boolean)
      },

      webhook: {
        urls: (process.env.WEBHOOK_URLS || '').split(',').filter(Boolean)
      },

      processing: {
        anomaly_detection: process.env.ANOMALY_DETECTION !== 'false',
        correlation: process.env.CORRELATION !== 'false',
        max_history_size: parseInt(process.env.MAX_HISTORY_SIZE || '100'),
        correlation_window: parseInt(process.env.CORRELATION_WINDOW || '60000'),
        sensor_timeout_minutes: parseInt(process.env.SENSOR_TIMEOUT_MINUTES || '10')
      },

      api: {
        enabled: process.env.API_ENABLED !== 'false',
        auth_required: process.env.API_AUTH_REQUIRED === 'true',
        api_key: process.env.API_KEY
      },

      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
      }
    };
  }

  /**
   * Get configuration value
   * @param {String} path - Dot notation path
   * @returns {*}
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Set configuration value
   * @param {String} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Validate configuration
   * @returns {Object}
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check if at least one message source is enabled
    if (!this.config.mqtt.enabled && !this.config.redis.enabled) {
      warnings.push('Neither MQTT nor Redis is enabled. Worker will not receive events.');
    }

    // Check notification channels
    if (this.config.email.enabled) {
      if (!this.config.email.smtp_user || !this.config.email.smtp_pass) {
        errors.push('Email enabled but SMTP credentials not configured');
      }
      if (this.config.email.recipients.length === 0) {
        warnings.push('Email enabled but no recipients configured');
      }
    }

    if (this.config.sms.enabled) {
      if (!this.config.sms.twilio_account_sid || !this.config.sms.twilio_auth_token) {
        errors.push('SMS enabled but Twilio credentials not configured');
      }
      if (this.config.sms.recipients.length === 0) {
        warnings.push('SMS enabled but no recipients configured');
      }
    }

    // Check API configuration
    if (this.config.api.auth_required && !this.config.api.api_key) {
      warnings.push('API authentication required but no API key configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get sanitized config (without sensitive data)
   * @returns {Object}
   */
  getSanitized() {
    const sanitized = JSON.parse(JSON.stringify(this.config));
    
    // Remove sensitive fields
    if (sanitized.mqtt?.password) sanitized.mqtt.password = '***';
    if (sanitized.redis?.password) sanitized.redis.password = '***';
    if (sanitized.email?.smtp_pass) sanitized.email.smtp_pass = '***';
    if (sanitized.sms?.twilio_auth_token) sanitized.sms.twilio_auth_token = '***';
    if (sanitized.api?.api_key) sanitized.api.api_key = '***';

    return sanitized;
  }
}

// Export singleton instance
module.exports = new Config();
