import WebSocket, { WebSocketServer } from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { redisQueue } from '../queue/redis-queue';

export class WebSocketService {
  private wss: WebSocketServer | null;
  private clients: Set<WebSocket>;

  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({
        port: config.websocket.port,
        perMessageDeflate: false,
      });

      this.wss.on('listening', () => {
        logger.info(`WebSocket server listening`, { port: config.websocket.port });
        resolve();
      });

      this.wss.on('connection', (ws: WebSocket, req) => {
        const clientIp = req.socket.remoteAddress;
        logger.info('WebSocket client connected', { clientIp });
        this.handleConnection(ws);
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', { error });
        metricsCollector.recordError('websocket_error');
      });

      // Subscribe to sensor events
      this.subscribeToEvents();
    });
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    metricsCollector.setActiveConnections('websocket', this.clients.size);

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      message: 'Connected to sensor data stream',
      timestamp: new Date().toISOString(),
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', { error });
        this.sendToClient(ws, {
          type: 'error',
          message: 'Invalid message format',
        });
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      metricsCollector.setActiveConnections('websocket', this.clients.size);
      logger.info('WebSocket client disconnected', {
        remainingClients: this.clients.size,
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', { error });
      metricsCollector.recordError('websocket_client_error');
    });

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
  }

  private handleClientMessage(ws: WebSocket, message: Record<string, unknown>): void {
    logger.debug('Received WebSocket message', { type: message.type });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws);
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          message: 'Unknown message type',
        });
    }
  }

  private handleSubscribe(ws: WebSocket, message: Record<string, unknown>): void {
    const { filters } = message;
    (ws as WebSocket & { filters?: Record<string, unknown> }).filters = (filters as Record<string, unknown>) || {};
    this.sendToClient(ws, {
      type: 'subscribed',
      filters: (ws as WebSocket & { filters?: Record<string, unknown> }).filters,
      timestamp: new Date().toISOString(),
    });
    logger.debug('Client subscribed with filters', { filters });
  }

  private handleUnsubscribe(ws: WebSocket): void {
    delete (ws as WebSocket & { filters?: Record<string, unknown> }).filters;
    this.sendToClient(ws, {
      type: 'unsubscribed',
      timestamp: new Date().toISOString(),
    });
    logger.debug('Client unsubscribed');
  }

  private subscribeToEvents(): void {
    redisQueue.subscribe('sensor-events', (message) => {
      try {
        const data = JSON.parse(message);
        this.broadcast(data);
      } catch (error) {
        logger.error('Error processing sensor event', { error });
      }
    });
  }

  private broadcast(data: Record<string, unknown>): void {
    const message = {
      type: 'sensor-data',
      data,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Apply filters if any
        if (this.shouldSendToClient(client, data)) {
          this.sendToClient(client, message);
          sentCount++;
        }
      }
    });

    if (sentCount > 0) {
      logger.debug(`Broadcast sensor data to ${sentCount} clients`, {
        deviceId: data.device_id,
      });
    }
  }

  private shouldSendToClient(client: WebSocket, data: Record<string, unknown>): boolean {
    const filters = (client as WebSocket & { filters?: Record<string, unknown> }).filters;
    if (!filters) {
      return true;
    }

    // Filter by device_id
    if (filters.device_id && filters.device_id !== data.device_id) {
      return false;
    }

    // Filter by sensor type
    if (filters.sensor_type) {
      const sensors = data.sensors as Record<string, unknown> | undefined;
      const sensorTypes = Object.keys(sensors || {});
      if (!sensorTypes.includes(filters.sensor_type as string)) {
        return false;
      }
    }

    return true;
  }

  private sendToClient(client: WebSocket, data: Record<string, unknown>): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  startHeartbeat(): void {
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        const wsWithAlive = ws as WebSocket & { isAlive?: boolean };
        if (wsWithAlive.isAlive === false) {
          logger.debug('Terminating inactive WebSocket client');
          return ws.terminate();
        }

        wsWithAlive.isAlive = false;
        ws.ping();
      });
    }, 30000);

    if (this.wss) {
      this.wss.on('close', () => {
        clearInterval(interval);
      });
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.wss) {
        // Close all client connections
        this.clients.forEach((client) => {
          client.close(1000, 'Server shutting down');
        });

        this.wss.close((err) => {
          if (err) {
            logger.error('Error stopping WebSocket server', { error: err });
            reject(err);
          } else {
            metricsCollector.setActiveConnections('websocket', 0);
            logger.info('WebSocket server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

export const websocketService = new WebSocketService();
