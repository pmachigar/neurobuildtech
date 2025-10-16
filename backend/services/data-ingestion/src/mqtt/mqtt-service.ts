import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { sensorValidator } from '../validators/sensor-validator';
import { dataProcessor } from '../processors/data-processor';
import { redisQueue } from '../queue/redis-queue';
import { SensorReading } from '../types';

export class MQTTService {
  private client: MqttClient | null;
  private isConnected: boolean;
  private reconnectAttempts: number;

  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: mqtt.IClientOptions = {
        clientId: config.mqtt.clientId,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
      };

      if (config.mqtt.username && config.mqtt.password) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('MQTT client connected', { broker: config.mqtt.brokerUrl });
        this.subscribe();
        metricsCollector.setActiveConnections('mqtt', 1);
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT client error', { error });
        metricsCollector.recordError('mqtt_error');
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        metricsCollector.setActiveConnections('mqtt', 0);
        logger.warn('MQTT client offline');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info(`MQTT client reconnecting (attempt ${this.reconnectAttempts})`);
      });

      this.client.on('message', this.handleMessage.bind(this));
    });
  }

  private subscribe(): void {
    if (!this.client) {
      return;
    }

    const topics = [
      `${config.mqtt.topicPrefix}/+/data`,
      `${config.mqtt.topicPrefix}/+/ld2410`,
      `${config.mqtt.topicPrefix}/+/pir`,
      `${config.mqtt.topicPrefix}/+/mq134`,
    ];

    topics.forEach((topic) => {
      this.client?.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic: ${topic}`, { error });
          metricsCollector.recordError('mqtt_subscribe_error');
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const startTime = Date.now();

    try {
      const message = payload.toString();
      logger.debug(`Received MQTT message`, { topic, size: message.length });

      let data: SensorReading;

      try {
        data = JSON.parse(message);
      } catch (error) {
        logger.error('Invalid JSON in MQTT message', { topic, error });
        metricsCollector.recordError('json_parse_error');
        return;
      }

      // Validate the data
      const validation = sensorValidator.validate(data);
      if (!validation.valid) {
        logger.warn('Invalid sensor data received', {
          topic,
          error: validation.error,
          deviceId: data.device_id,
        });
        metricsCollector.recordError('validation_error', data.device_id);
        return;
      }

      // Process the data
      const enriched = dataProcessor.process(validation.data!);
      if (!enriched) {
        logger.debug('Duplicate reading ignored', { deviceId: data.device_id });
        return;
      }

      // Enqueue for persistence
      await redisQueue.enqueue(enriched);

      // Publish for real-time consumption
      await redisQueue.publish('sensor-events', enriched);

      // Record metrics
      const sensorTypes = Object.keys(validation.data!.sensors);
      sensorTypes.forEach((type) => {
        metricsCollector.recordIngestion(validation.data!.device_id, type);
      });

      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordLatency('mqtt_processing', duration);

      logger.debug('Successfully processed MQTT message', {
        deviceId: validation.data!.device_id,
        duration,
      });
    } catch (error) {
      logger.error('Error processing MQTT message', { topic, error });
      metricsCollector.recordError('mqtt_processing_error');
    }
  }

  async publish(topic: string, data: unknown): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(data), { qos: 1 }, (error) => {
        if (error) {
          logger.error('Failed to publish MQTT message', { topic, error });
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          this.isConnected = false;
          metricsCollector.setActiveConnections('mqtt', 0);
          logger.info('MQTT client disconnected');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const mqttService = new MQTTService();
