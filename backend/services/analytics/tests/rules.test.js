/**
 * Rules Engine Tests
 */

const RulesEngine = require('../src/alerts/rules');

describe('RulesEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new RulesEngine();
  });

  describe('rule management', () => {
    test('should add a valid rule', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'warning',
        actions: ['email']
      };

      const added = engine.addRule(rule);
      
      expect(added).toBeDefined();
      expect(added.rule_id).toBe('test_rule');
      expect(added.enabled).toBe(true);
    });

    test('should reject invalid rule', () => {
      const rule = {
        rule_id: 'test_rule'
        // Missing required fields
      };

      expect(() => engine.addRule(rule)).toThrow();
    });

    test('should get rule by ID', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'warning'
      };

      engine.addRule(rule);
      const retrieved = engine.getRule('test_rule');
      
      expect(retrieved).toBeDefined();
      expect(retrieved.rule_id).toBe('test_rule');
    });

    test('should return null for non-existent rule', () => {
      const retrieved = engine.getRule('non_existent');
      expect(retrieved).toBeNull();
    });

    test('should delete rule', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'warning'
      };

      engine.addRule(rule);
      const deleted = engine.deleteRule('test_rule');
      
      expect(deleted).toBe(true);
      expect(engine.getRule('test_rule')).toBeNull();
    });

    test('should toggle rule enabled state', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'warning'
      };

      engine.addRule(rule);
      const toggled = engine.toggleRule('test_rule', false);
      
      expect(toggled.enabled).toBe(false);
    });
  });

  describe('rule filtering', () => {
    beforeEach(() => {
      engine.addRule({
        rule_id: 'rule1',
        sensor_type: 'mq134',
        condition: 'value > 100',
        alert_level: 'critical'
      });

      engine.addRule({
        rule_id: 'rule2',
        sensor_type: 'pir',
        condition: 'value == 1',
        alert_level: 'info'
      });

      engine.addRule({
        rule_id: 'rule3',
        sensor_type: 'mq134',
        condition: 'value > 50',
        alert_level: 'warning',
        enabled: false
      });
    });

    test('should filter by sensor type', () => {
      const rules = engine.getRules({ sensor_type: 'mq134' });
      expect(rules).toHaveLength(2);
      expect(rules.every(r => r.sensor_type === 'mq134')).toBe(true);
    });

    test('should filter by alert level', () => {
      const rules = engine.getRules({ alert_level: 'critical' });
      expect(rules).toHaveLength(1);
      expect(rules[0].alert_level).toBe('critical');
    });

    test('should filter by enabled status', () => {
      const rules = engine.getRules({ enabled: true });
      expect(rules.every(r => r.enabled === true)).toBe(true);
    });

    test('should get rules for specific sensor', () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'mq134'
      };

      const rules = engine.getRulesForSensor(sensorData);
      expect(rules.every(r => r.sensor_type === 'mq134' && r.enabled)).toBe(true);
    });
  });

  describe('templates', () => {
    test('should get available templates', () => {
      const templates = engine.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
    });

    test('should create rule from template', () => {
      const rule = engine.createFromTemplate('gas_high_critical');
      
      expect(rule).toBeDefined();
      expect(rule.sensor_type).toBe('mq134');
      expect(rule.alert_level).toBe('critical');
    });

    test('should create rule from template with overrides', () => {
      const rule = engine.createFromTemplate('gas_high_critical', {
        throttle_minutes: 30
      });
      
      expect(rule.throttle_minutes).toBe(30);
    });

    test('should throw error for non-existent template', () => {
      expect(() => engine.createFromTemplate('non_existent')).toThrow();
    });
  });

  describe('validation', () => {
    test('should validate correct rule', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'warning'
      };

      const validation = engine.validateRule(rule);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const rule = {
        rule_id: 'test_rule'
      };

      const validation = engine.validateRule(rule);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should validate alert level', () => {
      const rule = {
        rule_id: 'test_rule',
        condition: 'value > 100',
        alert_level: 'invalid'
      };

      const validation = engine.validateRule(rule);
      expect(validation.valid).toBe(false);
    });
  });

  describe('bulk operations', () => {
    test('should bulk import rules', () => {
      const rules = [
        {
          rule_id: 'bulk1',
          condition: 'value > 100',
          alert_level: 'warning'
        },
        {
          rule_id: 'bulk2',
          condition: 'value > 200',
          alert_level: 'critical'
        }
      ];

      const result = engine.bulkImport(rules);
      
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
    });

    test('should export rules', () => {
      engine.addRule({
        rule_id: 'export1',
        condition: 'value > 100',
        alert_level: 'warning'
      });

      const exported = engine.exportRules();
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    test('should get rule statistics', () => {
      engine.addRule({
        rule_id: 'stat1',
        sensor_type: 'mq134',
        condition: 'value > 100',
        alert_level: 'critical'
      });

      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('by_sensor_type');
      expect(stats).toHaveProperty('by_alert_level');
    });
  });
});
