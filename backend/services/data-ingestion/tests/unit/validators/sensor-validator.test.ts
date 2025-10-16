import { SensorValidator } from '../../../src/validators/sensor-validator';

describe('SensorValidator', () => {
  let validator: SensorValidator;

  beforeEach(() => {
    validator = new SensorValidator();
  });

  describe('validate', () => {
    it('should validate valid sensor reading with all sensors', () => {
      const data = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          ld2410: {
            presence: true,
            distance: 150,
            energy: 75,
          },
          pir: {
            motion_detected: true,
          },
          mq134: {
            gas_concentration: 250,
            unit: 'ppm',
          },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.device_id).toBe('esp32-001');
    });

    it('should validate sensor reading with only ld2410', () => {
      const data = {
        device_id: 'esp32-002',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          ld2410: {
            presence: false,
            distance: 0,
            energy: 0,
          },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.data?.sensors.ld2410).toBeDefined();
      expect(result.data?.sensors.pir).toBeUndefined();
    });

    it('should reject reading without device_id', () => {
      const data = {
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('device_id');
    });

    it('should reject reading with invalid timestamp', () => {
      const data = {
        device_id: 'esp32-001',
        timestamp: 'not-a-date',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('timestamp');
    });

    it('should reject reading without sensors', () => {
      const data = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {},
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
    });

    it('should reject ld2410 with invalid distance', () => {
      const data = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          ld2410: {
            presence: true,
            distance: -10,
            energy: 75,
          },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
    });

    it('should reject mq134 with invalid unit', () => {
      const data = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          mq134: {
            gas_concentration: 250,
            unit: 'invalid',
          },
        },
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDeviceId', () => {
    it('should validate valid device IDs', () => {
      expect(validator.validateDeviceId('esp32-001')).toBe(true);
      expect(validator.validateDeviceId('device_123')).toBe(true);
      expect(validator.validateDeviceId('ESP32-001')).toBe(true);
    });

    it('should reject invalid device IDs', () => {
      expect(validator.validateDeviceId('esp32 001')).toBe(false);
      expect(validator.validateDeviceId('esp32@001')).toBe(false);
      expect(validator.validateDeviceId('')).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('should validate valid timestamps', () => {
      expect(validator.validateTimestamp('2025-10-16T18:33:58Z')).toBe(true);
      expect(validator.validateTimestamp('2025-10-16T18:33:58.123Z')).toBe(true);
      expect(validator.validateTimestamp(new Date().toISOString())).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      expect(validator.validateTimestamp('not-a-date')).toBe(false);
      expect(validator.validateTimestamp('2025-13-45')).toBe(false);
      expect(validator.validateTimestamp('')).toBe(false);
    });
  });
});
