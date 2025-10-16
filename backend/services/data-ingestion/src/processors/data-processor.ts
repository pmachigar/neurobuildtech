import { SensorReading, EnrichedSensorReading, DeviceMetadata } from '../types';
import { logger } from '../utils/logger';

export class DataProcessor {
  private deviceMetadataCache: Map<string, DeviceMetadata>;
  private processedReadings: Set<string>;

  constructor() {
    this.deviceMetadataCache = new Map();
    this.processedReadings = new Set();
  }

  normalizeTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toISOString();
    } catch (error) {
      logger.warn(`Failed to normalize timestamp: ${timestamp}`, { error });
      return new Date().toISOString();
    }
  }

  isDuplicate(reading: SensorReading): boolean {
    const key = `${reading.device_id}-${reading.timestamp}`;
    if (this.processedReadings.has(key)) {
      return true;
    }
    this.processedReadings.add(key);
    
    // Cleanup old entries to prevent memory leak
    if (this.processedReadings.size > 10000) {
      const entries = Array.from(this.processedReadings);
      this.processedReadings = new Set(entries.slice(-5000));
    }
    
    return false;
  }

  enrichWithMetadata(reading: SensorReading): EnrichedSensorReading {
    const metadata = this.deviceMetadataCache.get(reading.device_id);
    
    return {
      ...reading,
      timestamp: this.normalizeTimestamp(reading.timestamp),
      received_at: new Date().toISOString(),
      processing_status: 'pending',
      device_metadata: metadata,
    };
  }

  updateDeviceMetadata(deviceId: string, metadata: DeviceMetadata): void {
    this.deviceMetadataCache.set(deviceId, metadata);
    logger.info(`Updated metadata for device: ${deviceId}`, { metadata });
  }

  getDeviceMetadata(deviceId: string): DeviceMetadata | undefined {
    return this.deviceMetadataCache.get(deviceId);
  }

  process(reading: SensorReading): EnrichedSensorReading | null {
    // Check for duplicates
    if (this.isDuplicate(reading)) {
      logger.debug(`Duplicate reading detected for device: ${reading.device_id}`);
      return null;
    }

    // Enrich with metadata
    const enriched = this.enrichWithMetadata(reading);

    logger.debug(`Processed reading for device: ${reading.device_id}`, {
      timestamp: enriched.timestamp,
      sensors: Object.keys(reading.sensors),
    });

    return enriched;
  }

  clearCache(): void {
    this.deviceMetadataCache.clear();
    this.processedReadings.clear();
    logger.info('Processor cache cleared');
  }
}

export const dataProcessor = new DataProcessor();
