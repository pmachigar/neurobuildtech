import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { sensorValidator } from '../validators/sensor-validator';
import { dataProcessor } from '../processors/data-processor';
import { redisQueue } from '../queue/redis-queue';
import { mqttService } from '../mqtt/mqtt-service';
import { SensorReading } from '../types';

export class HTTPService {
  private app: Express;
  private server: ReturnType<Express['listen']> | null;

  constructor() {
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        logger.debug('HTTP request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
        });
        metricsCollector.recordLatency('http_request', duration);
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      const mqttHealthy = mqttService.isHealthy();
      const redisHealthy = redisQueue.isHealthy();
      const healthy = mqttHealthy && redisHealthy;

      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          mqtt: mqttHealthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
        },
      });
    });

    // Readiness check endpoint
    this.app.get('/ready', async (req: Request, res: Response) => {
      const ready = mqttService.isHealthy() && redisQueue.isHealthy();
      res.status(ready ? 200 : 503).json({
        ready,
        timestamp: new Date().toISOString(),
      });
    });

    // Metrics endpoint
    this.app.get(config.metrics.path, async (req: Request, res: Response) => {
      try {
        const metrics = await metricsCollector.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Error retrieving metrics', { error });
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });

    // Submit sensor data endpoint
    this.app.post('/api/v1/sensor-data', async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        // Validate request body
        const validation = sensorValidator.validate(req.body);
        if (!validation.valid) {
          metricsCollector.recordError('validation_error', req.body.device_id);
          return res.status(400).json({
            error: 'Invalid sensor data',
            details: validation.error,
          });
        }

        const data = validation.data as SensorReading;

        // Process the data
        const enriched = dataProcessor.process(data);
        if (!enriched) {
          return res.status(409).json({
            error: 'Duplicate reading',
            device_id: data.device_id,
          });
        }

        // Enqueue for persistence
        const messageId = await redisQueue.enqueue(enriched);

        // Publish for real-time consumption
        await redisQueue.publish('sensor-events', enriched);

        // Record metrics
        const sensorTypes = Object.keys(data.sensors);
        sensorTypes.forEach((type) => {
          metricsCollector.recordIngestion(data.device_id, type);
        });

        const duration = (Date.now() - startTime) / 1000;
        metricsCollector.recordLatency('http_processing', duration);

        res.status(202).json({
          message: 'Sensor data accepted',
          message_id: messageId,
          device_id: data.device_id,
          timestamp: enriched.received_at,
        });
      } catch (error) {
        logger.error('Error processing sensor data', { error, body: req.body });
        metricsCollector.recordError('http_processing_error', req.body.device_id);
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    });

    // Batch submit endpoint
    this.app.post('/api/v1/sensor-data/batch', async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        const readings = Array.isArray(req.body) ? req.body : [req.body];

        if (readings.length === 0 || readings.length > 100) {
          return res.status(400).json({
            error: 'Batch size must be between 1 and 100',
          });
        }

        const results = [];

        for (const reading of readings) {
          const validation = sensorValidator.validate(reading);
          if (!validation.valid) {
            results.push({
              device_id: reading.device_id,
              status: 'failed',
              error: validation.error,
            });
            continue;
          }

          const enriched = dataProcessor.process(validation.data!);
          if (!enriched) {
            results.push({
              device_id: validation.data!.device_id,
              status: 'duplicate',
            });
            continue;
          }

          const messageId = await redisQueue.enqueue(enriched);
          await redisQueue.publish('sensor-events', enriched);

          const sensorTypes = Object.keys(validation.data!.sensors);
          sensorTypes.forEach((type) => {
            metricsCollector.recordIngestion(validation.data!.device_id, type);
          });

          results.push({
            device_id: validation.data!.device_id,
            status: 'accepted',
            message_id: messageId,
          });
        }

        const duration = (Date.now() - startTime) / 1000;
        metricsCollector.recordLatency('batch_processing', duration);

        res.status(202).json({
          message: 'Batch processed',
          total: readings.length,
          results,
        });
      } catch (error) {
        logger.error('Error processing batch', { error });
        metricsCollector.recordError('batch_processing_error');
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    });

    // Get queue status endpoint
    this.app.get('/api/v1/queue/status', async (req: Request, res: Response) => {
      try {
        const queueSize = await redisQueue.getQueueSize();
        const dlqSize = await redisQueue.getDLQSize();

        res.json({
          queue_size: queueSize,
          dlq_size: dlqSize,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error getting queue status', { error });
        res.status(500).json({
          error: 'Failed to retrieve queue status',
        });
      }
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      logger.error('Unhandled error', { error: err, path: req.path });
      metricsCollector.recordError('unhandled_error');
      res.status(500).json({
        error: 'Internal server error',
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info(`HTTP server listening`, {
          host: config.server.host,
          port: config.server.port,
        });
        metricsCollector.setActiveConnections('http', 1);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err?: Error) => {
          if (err) {
            logger.error('Error stopping HTTP server', { error: err });
            reject(err);
          } else {
            metricsCollector.setActiveConnections('http', 0);
            logger.info('HTTP server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

export const httpService = new HTTPService();
