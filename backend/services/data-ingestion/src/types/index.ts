export interface LD2410Data {
  presence: boolean;
  distance: number;
  energy: number;
}

export interface PIRData {
  motion_detected: boolean;
}

export interface MQ134Data {
  gas_concentration: number;
  unit: string;
}

export interface SensorData {
  ld2410?: LD2410Data;
  pir?: PIRData;
  mq134?: MQ134Data;
}

export interface SensorReading {
  device_id: string;
  timestamp: string;
  sensors: SensorData;
}

export interface EnrichedSensorReading extends SensorReading {
  received_at: string;
  processing_status: 'pending' | 'processed' | 'failed';
  device_metadata?: DeviceMetadata;
}

export interface DeviceMetadata {
  location?: string;
  room?: string;
  zone?: string;
  firmware_version?: string;
}

export interface QueueMessage {
  id: string;
  data: SensorReading;
  attempts: number;
  created_at: string;
  last_attempt_at?: string;
  error?: string;
}

export interface CircuitBreakerState {
  failures: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

export interface MetricsData {
  ingestRate: number;
  errorRate: number;
  latency: number;
  activeConnections: number;
  queueSize: number;
}
