import { config } from './config';
import { logger } from './utils/logger';
import { mqttService } from './mqtt/mqtt-service';
import { httpService } from './http/http-service';
import { websocketService } from './websocket/websocket-service';
import { redisQueue } from './queue/redis-queue';

class DataIngestionService {
  private isShuttingDown = false;

  async start(): Promise<void> {
    try {
      logger.info('Starting Data Ingestion Service', {
        environment: config.server.nodeEnv,
        port: config.server.port,
      });

      // Start MQTT service
      logger.info('Connecting to MQTT broker...');
      await mqttService.connect();

      // Start HTTP service
      logger.info('Starting HTTP service...');
      await httpService.start();

      // Start WebSocket service
      logger.info('Starting WebSocket service...');
      await websocketService.start();
      websocketService.startHeartbeat();

      logger.info('Data Ingestion Service started successfully', {
        mqtt: config.mqtt.brokerUrl,
        http: `http://${config.server.host}:${config.server.port}`,
        websocket: `ws://${config.server.host}:${config.websocket.port}`,
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start Data Ingestion Service', { error });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        await httpService.stop();
        await websocketService.stop();

        // Disconnect from services
        await mqttService.disconnect();
        await redisQueue.disconnect();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      shutdown('uncaughtException');
    });
  }
}

// Start the service
const service = new DataIngestionService();
service.start();
