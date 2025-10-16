import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { SensorReading, QueueMessage } from '../types';

export class RedisQueue {
  private client: Redis;
  private subscriber: Redis;
  private isConnected: boolean;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber = this.client.duplicate();
    this.isConnected = false;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error });
      metricsCollector.recordError('redis_error');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  async enqueue(data: SensorReading): Promise<string> {
    const message: QueueMessage = {
      id: uuidv4(),
      data,
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    try {
      await this.client.lpush(config.queue.name, JSON.stringify(message));
      const queueSize = await this.client.llen(config.queue.name);
      metricsCollector.setQueueSize(config.queue.name, queueSize);
      logger.debug(`Enqueued message ${message.id} for device ${data.device_id}`);
      return message.id;
    } catch (error) {
      logger.error('Failed to enqueue message', { error, data });
      throw error;
    }
  }

  async dequeue(): Promise<QueueMessage | null> {
    try {
      const data = await this.client.rpop(config.queue.name);
      if (!data) {
        return null;
      }

      const message: QueueMessage = JSON.parse(data);
      const queueSize = await this.client.llen(config.queue.name);
      metricsCollector.setQueueSize(config.queue.name, queueSize);
      return message;
    } catch (error) {
      logger.error('Failed to dequeue message', { error });
      throw error;
    }
  }

  async requeueWithRetry(message: QueueMessage, error: string): Promise<void> {
    message.attempts++;
    message.last_attempt_at = new Date().toISOString();
    message.error = error;

    if (message.attempts >= config.queue.maxRetryAttempts) {
      await this.moveToDLQ(message);
      logger.warn(`Message ${message.id} moved to DLQ after ${message.attempts} attempts`);
    } else {
      await new Promise((resolve) => setTimeout(resolve, config.queue.retryDelayMs));
      await this.client.lpush(config.queue.name, JSON.stringify(message));
      logger.debug(`Message ${message.id} requeued, attempt ${message.attempts}`);
    }
  }

  async moveToDLQ(message: QueueMessage): Promise<void> {
    try {
      await this.client.lpush(config.queue.dlqName, JSON.stringify(message));
      const dlqSize = await this.client.llen(config.queue.dlqName);
      metricsCollector.setQueueSize(config.queue.dlqName, dlqSize);
      logger.info(`Message ${message.id} moved to DLQ`);
    } catch (error) {
      logger.error('Failed to move message to DLQ', { error, message });
      throw error;
    }
  }

  async getQueueSize(): Promise<number> {
    return this.client.llen(config.queue.name);
  }

  async getDLQSize(): Promise<number> {
    return this.client.llen(config.queue.dlqName);
  }

  async publish(channel: string, data: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(data));
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    logger.info('Redis connections closed');
  }
}

export const redisQueue = new RedisQueue();
