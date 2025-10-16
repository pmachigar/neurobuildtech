/**
 * Threshold Processor Tests
 */

const ThresholdProcessor = require('../src/processors/threshold');

describe('ThresholdProcessor', () => {
  let processor;
  let mockNotifier;

  beforeEach(() => {
    mockNotifier = {
      notify: jest.fn().mockResolvedValue({ status: 'sent' })
    };
    processor = new ThresholdProcessor(mockNotifier);
  });

  describe('evaluateCondition', () => {
    test('should evaluate greater than condition', () => {
      const data = { gas_concentration: 600 };
      const result = processor.evaluateCondition(data, 'gas_concentration > 500');
      expect(result).toBe(true);
    });

    test('should evaluate less than condition', () => {
      const data = { gas_concentration: 400 };
      const result = processor.evaluateCondition(data, 'gas_concentration > 500');
      expect(result).toBe(false);
    });

    test('should evaluate equals condition', () => {
      const data = { value: 1 };
      const result = processor.evaluateCondition(data, 'value == 1');
      expect(result).toBe(true);
    });

    test('should evaluate nested field', () => {
      const data = { sensor: { reading: 750 } };
      const result = processor.evaluateCondition(data, 'sensor.reading > 500');
      expect(result).toBe(true);
    });

    test('should return false for invalid condition', () => {
      const data = { value: 100 };
      const result = processor.evaluateCondition(data, 'invalid condition');
      expect(result).toBe(false);
    });

    test('should return false for missing field', () => {
      const data = { value: 100 };
      const result = processor.evaluateCondition(data, 'nonexistent > 50');
      expect(result).toBe(false);
    });
  });

  describe('process', () => {
    test('should trigger alert when condition is met', async () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'mq134',
        gas_concentration: 600
      };

      const rules = [{
        rule_id: 'test_rule',
        sensor_type: 'mq134',
        condition: 'gas_concentration > 500',
        alert_level: 'critical',
        actions: ['email']
      }];

      const alerts = await processor.process(sensorData, rules);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_level).toBe('critical');
      expect(alerts[0].rule_id).toBe('test_rule');
      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ rule_id: 'test_rule' }),
        ['email']
      );
    });

    test('should not trigger alert when condition is not met', async () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'mq134',
        gas_concentration: 400
      };

      const rules = [{
        rule_id: 'test_rule',
        sensor_type: 'mq134',
        condition: 'gas_concentration > 500',
        alert_level: 'critical'
      }];

      const alerts = await processor.process(sensorData, rules);

      expect(alerts).toHaveLength(0);
      expect(mockNotifier.notify).not.toHaveBeenCalled();
    });

    test('should skip rule for different sensor type', async () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'pir',
        value: 1
      };

      const rules = [{
        rule_id: 'test_rule',
        sensor_type: 'mq134',
        condition: 'value == 1',
        alert_level: 'info'
      }];

      const alerts = await processor.process(sensorData, rules);

      expect(alerts).toHaveLength(0);
    });

    test('should respect throttling', async () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'mq134',
        gas_concentration: 600
      };

      const rules = [{
        rule_id: 'test_rule',
        sensor_type: 'mq134',
        condition: 'gas_concentration > 500',
        alert_level: 'critical',
        throttle_minutes: 5
      }];

      // First call should trigger
      const alerts1 = await processor.process(sensorData, rules);
      expect(alerts1).toHaveLength(1);

      // Second call should be throttled
      const alerts2 = await processor.process(sensorData, rules);
      expect(alerts2).toHaveLength(0);
    });

    test('should process multiple rules', async () => {
      const sensorData = {
        device_id: 'sensor_1',
        sensor_type: 'mq134',
        gas_concentration: 600
      };

      const rules = [
        {
          rule_id: 'warning_rule',
          sensor_type: 'mq134',
          condition: 'gas_concentration > 300',
          alert_level: 'warning'
        },
        {
          rule_id: 'critical_rule',
          sensor_type: 'mq134',
          condition: 'gas_concentration > 500',
          alert_level: 'critical'
        }
      ];

      const alerts = await processor.process(sensorData, rules);

      expect(alerts).toHaveLength(2);
      expect(alerts.map(a => a.rule_id)).toContain('warning_rule');
      expect(alerts.map(a => a.rule_id)).toContain('critical_rule');
    });
  });

  describe('throttling', () => {
    test('should clear throttle', () => {
      processor.updateThrottle('test_rule', 5);
      expect(processor.isThrottled('test_rule')).toBe(true);
      
      processor.clearThrottle('test_rule');
      expect(processor.isThrottled('test_rule')).toBe(false);
    });

    test('should clear all throttles', () => {
      processor.updateThrottle('rule1', 5);
      processor.updateThrottle('rule2', 5);
      
      processor.clearAllThrottles();
      
      expect(processor.isThrottled('rule1')).toBe(false);
      expect(processor.isThrottled('rule2')).toBe(false);
    });
  });
});
