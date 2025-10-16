/**
 * Threshold Processor
 * Handles threshold-based alerting for sensor events
 */

class ThresholdProcessor {
  constructor(alertNotifier) {
    this.alertNotifier = alertNotifier;
    this.lastAlertTimes = new Map(); // For throttling
  }

  /**
   * Process sensor data against threshold rules
   * @param {Object} sensorData - Sensor reading data
   * @param {Array} rules - Array of threshold rules
   * @returns {Array} - Array of alerts triggered
   */
  async process(sensorData, rules) {
    const alerts = [];

    for (const rule of rules) {
      if (this.shouldSkipRule(rule, sensorData)) {
        continue;
      }

      const isViolated = this.evaluateCondition(sensorData, rule.condition);
      
      if (isViolated && !this.isThrottled(rule.rule_id)) {
        const alert = this.createAlert(sensorData, rule);
        alerts.push(alert);
        
        // Send notifications
        if (this.alertNotifier) {
          await this.alertNotifier.notify(alert, rule.actions || []);
        }
        
        // Update throttle timestamp
        this.updateThrottle(rule.rule_id, rule.throttle_minutes || 0);
      }
    }

    return alerts;
  }

  /**
   * Evaluate condition expression
   * @param {Object} data - Sensor data
   * @param {String} condition - Condition expression
   * @returns {Boolean}
   */
  evaluateCondition(data, condition) {
    try {
      // Parse simple conditions like "gas_concentration > 500" or "sensor.reading > 500"
      const match = condition.match(/([\w.]+)\s*([><=!]+)\s*(\d+\.?\d*)/);
      
      if (!match) {
        console.warn(`Invalid condition format: ${condition}`);
        return false;
      }

      const [, field, operator, valueStr] = match;
      const value = parseFloat(valueStr);
      const dataValue = this.getNestedValue(data, field);

      if (dataValue === undefined) {
        return false;
      }

      switch (operator) {
        case '>':
          return dataValue > value;
        case '>=':
          return dataValue >= value;
        case '<':
          return dataValue < value;
        case '<=':
          return dataValue <= value;
        case '==':
        case '===':
          return dataValue === value;
        case '!=':
        case '!==':
          return dataValue !== value;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {String} path - Dot notation path
   * @returns {*}
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if rule should be skipped based on sensor type
   * @param {Object} rule - Alert rule
   * @param {Object} data - Sensor data
   * @returns {Boolean}
   */
  shouldSkipRule(rule, data) {
    if (rule.sensor_type && data.sensor_type !== rule.sensor_type) {
      return true;
    }
    if (rule.device_id && data.device_id !== rule.device_id) {
      return true;
    }
    return false;
  }

  /**
   * Check if alert is throttled
   * @param {String} ruleId - Rule identifier
   * @returns {Boolean}
   */
  isThrottled(ruleId) {
    const lastAlertTime = this.lastAlertTimes.get(ruleId);
    return !!(lastAlertTime && Date.now() < lastAlertTime);
  }

  /**
   * Update throttle timestamp
   * @param {String} ruleId - Rule identifier
   * @param {Number} throttleMinutes - Throttle duration in minutes
   */
  updateThrottle(ruleId, throttleMinutes) {
    if (throttleMinutes > 0) {
      const throttleUntil = Date.now() + (throttleMinutes * 60 * 1000);
      this.lastAlertTimes.set(ruleId, throttleUntil);
    }
  }

  /**
   * Create alert object
   * @param {Object} data - Sensor data
   * @param {Object} rule - Alert rule
   * @returns {Object}
   */
  createAlert(data, rule) {
    return {
      alert_id: this.generateAlertId(),
      rule_id: rule.rule_id,
      alert_level: rule.alert_level || 'warning',
      sensor_type: data.sensor_type,
      device_id: data.device_id,
      timestamp: new Date().toISOString(),
      condition: rule.condition,
      value: this.extractRelevantValue(data, rule.condition),
      message: this.generateMessage(data, rule),
      data: data
    };
  }

  /**
   * Extract relevant value from data based on condition
   * @param {Object} data - Sensor data
   * @param {String} condition - Condition expression
   * @returns {*}
   */
  extractRelevantValue(data, condition) {
    const match = condition.match(/(\w+)\s*[><=!]+/);
    if (match) {
      const field = match[1];
      return this.getNestedValue(data, field);
    }
    return null;
  }

  /**
   * Generate alert message
   * @param {Object} data - Sensor data
   * @param {Object} rule - Alert rule
   * @returns {String}
   */
  generateMessage(data, rule) {
    const value = this.extractRelevantValue(data, rule.condition);
    return `${rule.alert_level.toUpperCase()}: ${rule.rule_id} - ${rule.condition} (value: ${value})`;
  }

  /**
   * Generate unique alert ID
   * @returns {String}
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear throttle for a rule (useful for testing or manual reset)
   * @param {String} ruleId - Rule identifier
   */
  clearThrottle(ruleId) {
    this.lastAlertTimes.delete(ruleId);
  }

  /**
   * Clear all throttles
   */
  clearAllThrottles() {
    this.lastAlertTimes.clear();
  }
}

module.exports = ThresholdProcessor;
