/**
 * Event Worker
 * Processes sensor events from message queue
 */

class EventWorker {
  constructor(config) {
    this.config = config;
    this.processors = config.processors || {};
    this.isRunning = false;
    this.processedCount = 0;
    this.errorCount = 0;
    this.startTime = null;
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      console.log('Worker already running');
      return;
    }

    console.log('Starting event worker...');
    this.isRunning = true;
    this.startTime = Date.now();

    // Initialize MQTT client if configured
    if (this.config.mqtt?.enabled) {
      await this.initializeMQTT();
    }

    // Initialize Redis client if configured
    if (this.config.redis?.enabled) {
      await this.initializeRedis();
    }

    console.log('Event worker started successfully');
  }

  /**
   * Stop the worker
   */
  async stop() {
    console.log('Stopping event worker...');
    this.isRunning = false;

    // Cleanup connections
    if (this.mqttClient) {
      await this.mqttClient.end();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    console.log('Event worker stopped');
  }

  /**
   * Initialize MQTT connection
   */
  async initializeMQTT() {
    try {
      const mqtt = require('mqtt');
      
      const options = {
        host: this.config.mqtt.host || 'localhost',
        port: this.config.mqtt.port || 1883,
        username: this.config.mqtt.username,
        password: this.config.mqtt.password,
        clientId: `analytics_worker_${Date.now()}`
      };

      this.mqttClient = mqtt.connect(options);

      this.mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
        
        // Subscribe to sensor topics
        const topics = this.config.mqtt.topics || ['sensors/#'];
        this.mqttClient.subscribe(topics, (err) => {
          if (err) {
            console.error('Failed to subscribe to topics:', err);
          } else {
            console.log('Subscribed to topics:', topics);
          }
        });
      });

      this.mqttClient.on('message', async (topic, message) => {
        await this.handleMessage(topic, message);
      });

      this.mqttClient.on('error', (error) => {
        console.error('MQTT error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize MQTT:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      const redis = require('redis');
      
      this.redisClient = redis.createClient({
        host: this.config.redis.host || 'localhost',
        port: this.config.redis.port || 6379,
        password: this.config.redis.password
      });

      await this.redisClient.connect();
      console.log('Connected to Redis');

      // Listen for events on Redis streams if configured
      if (this.config.redis.stream) {
        this.startRedisStreamConsumer();
      }

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * Start Redis stream consumer
   */
  async startRedisStreamConsumer() {
    const streamKey = this.config.redis.stream;
    const groupName = 'analytics-workers';
    const consumerName = `worker-${Date.now()}`;

    try {
      // Create consumer group if it doesn't exist
      try {
        await this.redisClient.xGroupCreate(streamKey, groupName, '0', {
          MKSTREAM: true
        });
      } catch (error) {
        // Group might already exist
      }

      // Continuously read from stream
      while (this.isRunning) {
        try {
          const messages = await this.redisClient.xReadGroup(
            groupName,
            consumerName,
            [{ key: streamKey, id: '>' }],
            { COUNT: 10, BLOCK: 5000 }
          );

          if (messages && messages.length > 0) {
            for (const stream of messages) {
              for (const message of stream.messages) {
                await this.processRedisMessage(message);
                // Acknowledge message
                await this.redisClient.xAck(streamKey, groupName, message.id);
              }
            }
          }
        } catch (error) {
          console.error('Error reading from Redis stream:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Redis stream consumer error:', error);
    }
  }

  /**
   * Handle incoming MQTT message
   * @param {String} topic - MQTT topic
   * @param {Buffer} message - Message payload
   */
  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      await this.processEvent(data);
      this.processedCount++;
    } catch (error) {
      console.error('Error handling message:', error);
      this.errorCount++;
    }
  }

  /**
   * Process Redis message
   * @param {Object} message - Redis stream message
   */
  async processRedisMessage(message) {
    try {
      const data = JSON.parse(message.message.data || '{}');
      await this.processEvent(data);
      this.processedCount++;
    } catch (error) {
      console.error('Error processing Redis message:', error);
      this.errorCount++;
    }
  }

  /**
   * Process a sensor event
   * @param {Object} event - Sensor event data
   */
  async processEvent(event) {
    const startTime = Date.now();

    try {
      // Run through threshold processor
      if (this.processors.threshold && this.processors.rules) {
        const rules = this.processors.rules.getRulesForSensor(event);
        if (rules.length > 0) {
          await this.processors.threshold.process(event, rules);
        }
      }

      // Run through anomaly detector
      if (this.processors.anomaly) {
        await this.processors.anomaly.process(event);
      }

      // Run through correlation processor
      if (this.processors.correlation) {
        await this.processors.correlation.process(event);
      }

      // Store event in Redis for state management
      if (this.redisClient) {
        await this.storeEventState(event);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`Slow event processing: ${processingTime}ms`);
      }

    } catch (error) {
      console.error('Error processing event:', error);
      throw error;
    }
  }

  /**
   * Store event state in Redis
   * @param {Object} event - Event data
   */
  async storeEventState(event) {
    try {
      const key = `event:${event.device_id}:latest`;
      await this.redisClient.set(key, JSON.stringify(event), {
        EX: 3600 // Expire after 1 hour
      });

      // Store in time-series key for analytics
      const tsKey = `events:${event.sensor_type}`;
      await this.redisClient.zAdd(tsKey, {
        score: Date.now(),
        value: JSON.stringify(event)
      });

      // Trim old events (keep last 1000)
      await this.redisClient.zRemRangeByRank(tsKey, 0, -1001);

    } catch (error) {
      console.error('Error storing event state:', error);
    }
  }

  /**
   * Get worker metrics
   * @returns {Object}
   */
  getMetrics() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    const eventsPerSecond = uptime > 0 ? (this.processedCount / (uptime / 1000)).toFixed(2) : 0;

    return {
      is_running: this.isRunning,
      uptime_ms: uptime,
      uptime_seconds: Math.floor(uptime / 1000),
      processed_count: this.processedCount,
      error_count: this.errorCount,
      events_per_second: parseFloat(eventsPerSecond),
      success_rate: this.processedCount > 0 
        ? ((this.processedCount / (this.processedCount + this.errorCount)) * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }
}

module.exports = EventWorker;
