/**
 * Anomaly Detector Tests
 */

const AnomalyDetector = require('../src/processors/anomaly');

describe('AnomalyDetector', () => {
  let detector;
  let mockNotifier;

  beforeEach(() => {
    mockNotifier = {
      notify: jest.fn().mockResolvedValue({ status: 'sent' })
    };
    detector = new AnomalyDetector(mockNotifier);
  });

  describe('detectSuddenSpike', () => {
    test('should detect sudden spike using direct method', () => {
      const deviceId = 'sensor_1';
      
      // Add normal readings with slight variation
      for (let i = 0; i < 10; i++) {
        detector.addToHistory(deviceId, {
          device_id: deviceId,
          sensor_type: 'mq134',
          value: 100 + i
        });
      }

      // Test spike detection directly
      const spikeResult = detector.detectSuddenSpike(deviceId, {
        device_id: deviceId,
        sensor_type: 'mq134',
        value: 500 // Very large spike
      });

      expect(spikeResult).toBeDefined();
      expect(spikeResult.type).toBe('sudden_spike');
    });
  });

  describe('detectFlatline', () => {
    test('should detect flatline', async () => {
      const deviceId = 'sensor_2';
      
      // Add identical readings
      for (let i = 0; i < 12; i++) {
        await detector.process({
          device_id: deviceId,
          sensor_type: 'temperature',
          value: 25
        });
      }

      const history = detector.getHistory(deviceId);
      expect(history.length).toBeGreaterThanOrEqual(10);

      // Check for flatline in the last event
      const lastEvent = history[history.length - 1];
      const flatline = detector.detectFlatline(deviceId, lastEvent);
      expect(flatline).toBeDefined();
      expect(flatline.type).toBe('flatline');
    });
  });

  describe('detectOutOfRange', () => {
    test('should detect out of range value for mq134', async () => {
      const deviceId = 'sensor_3';
      
      const alerts = await detector.process({
        device_id: deviceId,
        sensor_type: 'mq134',
        value: 1500 // Out of range
      });

      const outOfRangeAlert = alerts.find(a => a.anomaly_type === 'out_of_range');
      expect(outOfRangeAlert).toBeDefined();
    });

    test('should not detect in-range value', async () => {
      const deviceId = 'sensor_4';
      
      const alerts = await detector.process({
        device_id: deviceId,
        sensor_type: 'mq134',
        value: 500 // In range
      });

      const outOfRangeAlert = alerts.find(a => a.anomaly_type === 'out_of_range');
      expect(outOfRangeAlert).toBeUndefined();
    });
  });

  describe('checkSensorFailures', () => {
    test('should detect sensor failure', () => {
      const deviceId = 'sensor_5';
      
      // Simulate old activity
      detector.updateSensorActivity(deviceId);
      detector.sensorLastSeen.set(deviceId, Date.now() - 15 * 60 * 1000); // 15 minutes ago

      const failures = detector.checkSensorFailures(10);
      
      expect(failures).toHaveLength(1);
      expect(failures[0].device_id).toBe(deviceId);
      expect(failures[0].type).toBe('sensor_failure');
    });

    test('should not detect failure for active sensor', () => {
      const deviceId = 'sensor_6';
      
      detector.updateSensorActivity(deviceId);

      const failures = detector.checkSensorFailures(10);
      
      expect(failures).toHaveLength(0);
    });
  });

  describe('history management', () => {
    test('should add to history', async () => {
      const deviceId = 'sensor_7';
      
      await detector.process({
        device_id: deviceId,
        sensor_type: 'mq134',
        value: 100
      });

      const history = detector.getHistory(deviceId);
      expect(history).toHaveLength(1);
    });

    test('should limit history size', async () => {
      const deviceId = 'sensor_8';
      detector.maxHistorySize = 10;
      
      // Add more than max
      for (let i = 0; i < 15; i++) {
        await detector.process({
          device_id: deviceId,
          sensor_type: 'mq134',
          value: 100 + i
        });
      }

      const history = detector.getHistory(deviceId);
      expect(history.length).toBeLessThanOrEqual(detector.maxHistorySize);
    });

    test('should clear history', async () => {
      const deviceId = 'sensor_9';
      
      await detector.process({
        device_id: deviceId,
        sensor_type: 'mq134',
        value: 100
      });

      detector.clearHistory(deviceId);
      
      const history = detector.getHistory(deviceId);
      expect(history).toHaveLength(0);
    });
  });

  describe('statistical calculations', () => {
    test('should calculate average', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = detector.calculateAverage(values);
      expect(avg).toBe(30);
    });

    test('should calculate standard deviation', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = detector.calculateAverage(values);
      const stdDev = detector.calculateStdDev(values, avg);
      expect(stdDev).toBeGreaterThan(0);
    });
  });
});
