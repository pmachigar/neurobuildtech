import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;
  private ingestCounter: Counter;
  private errorCounter: Counter;
  private latencyHistogram: Histogram;
  private activeConnectionsGauge: Gauge;
  private queueSizeGauge: Gauge;

  constructor() {
    this.registry = new Registry();

    this.ingestCounter = new Counter({
      name: 'sensor_data_ingested_total',
      help: 'Total number of sensor readings ingested',
      labelNames: ['device_id', 'sensor_type'],
      registers: [this.registry],
    });

    this.errorCounter = new Counter({
      name: 'sensor_data_errors_total',
      help: 'Total number of ingestion errors',
      labelNames: ['error_type', 'device_id'],
      registers: [this.registry],
    });

    this.latencyHistogram = new Histogram({
      name: 'sensor_data_processing_latency_seconds',
      help: 'Latency of sensor data processing in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.activeConnectionsGauge = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['connection_type'],
      registers: [this.registry],
    });

    this.queueSizeGauge = new Gauge({
      name: 'queue_size',
      help: 'Current size of message queue',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });
  }

  recordIngestion(deviceId: string, sensorType: string): void {
    this.ingestCounter.inc({ device_id: deviceId, sensor_type: sensorType });
  }

  recordError(errorType: string, deviceId?: string): void {
    this.errorCounter.inc({ error_type: errorType, device_id: deviceId || 'unknown' });
  }

  recordLatency(operation: string, durationSeconds: number): void {
    this.latencyHistogram.observe({ operation }, durationSeconds);
  }

  setActiveConnections(connectionType: string, count: number): void {
    this.activeConnectionsGauge.set({ connection_type: connectionType }, count);
  }

  setQueueSize(queueName: string, size: number): void {
    this.queueSizeGauge.set({ queue_name: queueName }, size);
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

export const metricsCollector = new MetricsCollector();
