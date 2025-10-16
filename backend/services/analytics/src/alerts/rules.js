/**
 * Rules Engine
 * Manages alert rules and templates
 */

class RulesEngine {
  constructor() {
    this.rules = new Map(); // Store rules by ID
    this.templates = this.loadTemplates();
  }

  /**
   * Load rule templates
   * @returns {Object}
   */
  loadTemplates() {
    return {
      gas_high_critical: {
        rule_id: 'gas_high_critical',
        sensor_type: 'mq134',
        condition: 'gas_concentration > 500',
        alert_level: 'critical',
        actions: ['email', 'webhook', 'sms'],
        throttle_minutes: 15,
        description: 'Critical gas concentration level detected'
      },
      gas_high_warning: {
        rule_id: 'gas_high_warning',
        sensor_type: 'mq134',
        condition: 'gas_concentration > 300',
        alert_level: 'warning',
        actions: ['email', 'webhook'],
        throttle_minutes: 30,
        description: 'Elevated gas concentration level detected'
      },
      presence_detected: {
        rule_id: 'presence_detected',
        sensor_type: 'ld2410',
        condition: 'value == 1',
        alert_level: 'info',
        actions: ['webhook'],
        throttle_minutes: 0,
        description: 'Presence detected in area'
      },
      motion_detected: {
        rule_id: 'motion_detected',
        sensor_type: 'pir',
        condition: 'value == 1',
        alert_level: 'info',
        actions: ['webhook'],
        throttle_minutes: 0,
        description: 'Motion detected in area'
      },
      temperature_high: {
        rule_id: 'temperature_high',
        sensor_type: 'temperature',
        condition: 'temperature > 35',
        alert_level: 'warning',
        actions: ['email', 'webhook'],
        throttle_minutes: 20,
        description: 'High temperature detected'
      },
      temperature_low: {
        rule_id: 'temperature_low',
        sensor_type: 'temperature',
        condition: 'temperature < 10',
        alert_level: 'warning',
        actions: ['email', 'webhook'],
        throttle_minutes: 20,
        description: 'Low temperature detected'
      },
      humidity_high: {
        rule_id: 'humidity_high',
        sensor_type: 'humidity',
        condition: 'humidity > 80',
        alert_level: 'warning',
        actions: ['email', 'webhook'],
        throttle_minutes: 30,
        description: 'High humidity detected'
      }
    };
  }

  /**
   * Add or update a rule
   * @param {Object} rule - Rule configuration
   * @returns {Object} - Added/updated rule
   */
  addRule(rule) {
    // Validate rule
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    // Set defaults
    const completeRule = {
      ...rule,
      created_at: rule.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      enabled: rule.enabled !== undefined ? rule.enabled : true
    };

    this.rules.set(rule.rule_id, completeRule);
    return completeRule;
  }

  /**
   * Get rule by ID
   * @param {String} ruleId - Rule identifier
   * @returns {Object|null}
   */
  getRule(ruleId) {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get all rules
   * @param {Object} filters - Optional filters
   * @returns {Array}
   */
  getRules(filters = {}) {
    let rules = Array.from(this.rules.values());

    // Apply filters
    if (filters.sensor_type) {
      rules = rules.filter(r => r.sensor_type === filters.sensor_type);
    }

    if (filters.alert_level) {
      rules = rules.filter(r => r.alert_level === filters.alert_level);
    }

    if (filters.device_id) {
      rules = rules.filter(r => !r.device_id || r.device_id === filters.device_id);
    }

    if (filters.enabled !== undefined) {
      rules = rules.filter(r => r.enabled === filters.enabled);
    }

    return rules;
  }

  /**
   * Get rules for a specific sensor event
   * @param {Object} sensorData - Sensor event data
   * @returns {Array}
   */
  getRulesForSensor(sensorData) {
    return this.getRules({
      sensor_type: sensorData.sensor_type,
      device_id: sensorData.device_id,
      enabled: true
    });
  }

  /**
   * Delete a rule
   * @param {String} ruleId - Rule identifier
   * @returns {Boolean}
   */
  deleteRule(ruleId) {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable/disable a rule
   * @param {String} ruleId - Rule identifier
   * @param {Boolean} enabled - Enable or disable
   * @returns {Object|null}
   */
  toggleRule(ruleId, enabled) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return null;
    }

    rule.enabled = enabled;
    rule.updated_at = new Date().toISOString();
    return rule;
  }

  /**
   * Create rule from template
   * @param {String} templateName - Template name
   * @param {Object} overrides - Optional overrides
   * @returns {Object}
   */
  createFromTemplate(templateName, overrides = {}) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const rule = {
      ...template,
      ...overrides,
      rule_id: overrides.rule_id || `${templateName}_${Date.now()}`
    };

    return this.addRule(rule);
  }

  /**
   * Get available templates
   * @returns {Array}
   */
  getTemplates() {
    return Object.keys(this.templates).map(key => ({
      name: key,
      ...this.templates[key]
    }));
  }

  /**
   * Validate rule configuration
   * @param {Object} rule - Rule to validate
   * @returns {Object} - Validation result
   */
  validateRule(rule) {
    const errors = [];

    // Required fields
    if (!rule.rule_id) {
      errors.push('rule_id is required');
    }

    if (!rule.condition) {
      errors.push('condition is required');
    }

    if (!rule.alert_level) {
      errors.push('alert_level is required');
    }

    // Validate alert level
    const validLevels = ['critical', 'warning', 'info'];
    if (rule.alert_level && !validLevels.includes(rule.alert_level)) {
      errors.push(`alert_level must be one of: ${validLevels.join(', ')}`);
    }

    // Validate actions
    if (rule.actions && !Array.isArray(rule.actions)) {
      errors.push('actions must be an array');
    }

    // Validate throttle
    if (rule.throttle_minutes !== undefined) {
      if (typeof rule.throttle_minutes !== 'number' || rule.throttle_minutes < 0) {
        errors.push('throttle_minutes must be a non-negative number');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Test rule against sample data
   * @param {String} ruleId - Rule identifier
   * @param {Object} sampleData - Sample sensor data
   * @returns {Object}
   */
  testRule(ruleId, sampleData) {
    const rule = this.getRule(ruleId);
    if (!rule) {
      return {
        success: false,
        error: 'Rule not found'
      };
    }

    try {
      // Use threshold processor logic for testing
      const ThresholdProcessor = require('../processors/threshold');
      const processor = new ThresholdProcessor(null);
      
      const isViolated = processor.evaluateCondition(sampleData, rule.condition);

      return {
        success: true,
        rule_id: ruleId,
        condition: rule.condition,
        sample_data: sampleData,
        would_trigger: isViolated,
        alert_level: rule.alert_level,
        actions: rule.actions
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk import rules
   * @param {Array} rules - Array of rules
   * @returns {Object} - Import results
   */
  bulkImport(rules) {
    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    for (const rule of rules) {
      try {
        this.addRule(rule);
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          rule_id: rule.rule_id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Export rules
   * @param {Object} filters - Optional filters
   * @returns {Array}
   */
  exportRules(filters = {}) {
    return this.getRules(filters);
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this.rules.clear();
  }

  /**
   * Get rule statistics
   * @returns {Object}
   */
  getStats() {
    const rules = Array.from(this.rules.values());
    
    const stats = {
      total: rules.length,
      enabled: rules.filter(r => r.enabled).length,
      disabled: rules.filter(r => !r.enabled).length,
      by_sensor_type: {},
      by_alert_level: {}
    };

    for (const rule of rules) {
      // Count by sensor type
      const sensorType = rule.sensor_type || 'global';
      stats.by_sensor_type[sensorType] = (stats.by_sensor_type[sensorType] || 0) + 1;

      // Count by alert level
      stats.by_alert_level[rule.alert_level] = (stats.by_alert_level[rule.alert_level] || 0) + 1;
    }

    return stats;
  }
}

module.exports = RulesEngine;
