import { DataProcessor } from '../../../src/processors/data-processor';
import { SensorReading } from '../../../src/types';

describe('DataProcessor', () => {
  let processor: DataProcessor;

  beforeEach(() => {
    processor = new DataProcessor();
  });

  afterEach(() => {
    processor.clearCache();
  });

  describe('normalizeTimestamp', () => {
    it('should normalize valid ISO timestamp', () => {
      const timestamp = '2025-10-16T18:33:58Z';
      const normalized = processor.normalizeTimestamp(timestamp);
      expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should normalize timestamp without milliseconds', () => {
      const timestamp = '2025-10-16T18:33:58Z';
      const normalized = processor.normalizeTimestamp(timestamp);
      expect(normalized).toBe(new Date(timestamp).toISOString());
    });

    it('should handle invalid timestamp gracefully', () => {
      const timestamp = 'invalid-date';
      const normalized = processor.normalizeTimestamp(timestamp);
      expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('isDuplicate', () => {
    it('should detect duplicate readings', () => {
      const reading: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      expect(processor.isDuplicate(reading)).toBe(false);
      expect(processor.isDuplicate(reading)).toBe(true);
    });

    it('should not detect different readings as duplicates', () => {
      const reading1: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      const reading2: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:34:00Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      expect(processor.isDuplicate(reading1)).toBe(false);
      expect(processor.isDuplicate(reading2)).toBe(false);
    });
  });

  describe('enrichWithMetadata', () => {
    it('should enrich reading with metadata', () => {
      const reading: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      processor.updateDeviceMetadata('esp32-001', {
        location: 'Building A',
        room: 'Room 101',
      });

      const enriched = processor.enrichWithMetadata(reading);

      expect(enriched.received_at).toBeDefined();
      expect(enriched.processing_status).toBe('pending');
      expect(enriched.device_metadata).toBeDefined();
      expect(enriched.device_metadata?.location).toBe('Building A');
      expect(enriched.device_metadata?.room).toBe('Room 101');
    });

    it('should enrich reading without metadata if not available', () => {
      const reading: SensorReading = {
        device_id: 'esp32-002',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      const enriched = processor.enrichWithMetadata(reading);

      expect(enriched.received_at).toBeDefined();
      expect(enriched.processing_status).toBe('pending');
      expect(enriched.device_metadata).toBeUndefined();
    });
  });

  describe('process', () => {
    it('should process valid reading successfully', () => {
      const reading: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          ld2410: {
            presence: true,
            distance: 150,
            energy: 75,
          },
        },
      };

      const result = processor.process(reading);

      expect(result).not.toBeNull();
      expect(result?.device_id).toBe('esp32-001');
      expect(result?.received_at).toBeDefined();
      expect(result?.processing_status).toBe('pending');
    });

    it('should return null for duplicate readings', () => {
      const reading: SensorReading = {
        device_id: 'esp32-001',
        timestamp: '2025-10-16T18:33:58Z',
        sensors: {
          pir: { motion_detected: true },
        },
      };

      const result1 = processor.process(reading);
      expect(result1).not.toBeNull();

      const result2 = processor.process(reading);
      expect(result2).toBeNull();
    });
  });

  describe('updateDeviceMetadata', () => {
    it('should update and retrieve device metadata', () => {
      const metadata = {
        location: 'Building A',
        room: 'Room 101',
        zone: 'Zone 1',
      };

      processor.updateDeviceMetadata('esp32-001', metadata);
      const retrieved = processor.getDeviceMetadata('esp32-001');

      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for non-existent device', () => {
      const retrieved = processor.getDeviceMetadata('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });
});
