/**
 * Analytics Service - Main Entry Point
 * Real-time sensor event processing and analytics
 */

const express = require('express');
const config = require('./config/config');

// Import processors
const ThresholdProcessor = require('./processors/threshold');
const AnomalyDetector = require('./processors/anomaly');
const CorrelationProcessor = require('./processors/correlation');

// Import alert system
const AlertNotifier = require('./alerts/notifier');
const RulesEngine = require('./alerts/rules');

// Import worker
const EventWorker = require('./workers/eventWorker');

class AnalyticsService {
  constructor() {
    this.config = config;
    this.app = express();
    this.initializeComponents();
  }

  /**
   * Initialize service components
   */
  initializeComponents() {
    // Initialize alert notifier
    this.notifier = new AlertNotifier(this.config.getAll());
    
    // Initialize rules engine
    this.rulesEngine = new RulesEngine();
    
    // Initialize processors
    this.thresholdProcessor = new ThresholdProcessor(this.notifier);
    this.anomalyDetector = new AnomalyDetector(this.notifier);
    this.correlationProcessor = new CorrelationProcessor(this.notifier);

    // Initialize worker
    this.worker = new EventWorker({
      ...this.config.getAll(),
      processors: {
        threshold: this.thresholdProcessor,
        anomaly: this.anomalyDetector,
        correlation: this.correlationProcessor,
        rules: this.rulesEngine
      }
    });
  }

  /**
   * Setup Express middleware and routes
   */
  setupAPI() {
    // Middleware
    this.app.use(express.json());

    // API authentication middleware
    if (this.config.get('api.auth_required')) {
      this.app.use('/api', (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== this.config.get('api.api_key')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
    }

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: this.config.get('service.name'),
        timestamp: new Date().toISOString()
      });
    });

    // Status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json({
        service: this.config.get('service.name'),
        worker: this.worker.getMetrics(),
        config: this.config.getSanitized(),
        timestamp: new Date().toISOString()
      });
    });

    // Rules endpoints
    this.app.get('/api/rules', (req, res) => {
      const filters = {
        sensor_type: req.query.sensor_type,
        alert_level: req.query.alert_level,
        enabled: req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined
      };
      const rules = this.rulesEngine.getRules(filters);
      res.json({ rules, count: rules.length });
    });

    this.app.get('/api/rules/:ruleId', (req, res) => {
      const rule = this.rulesEngine.getRule(req.params.ruleId);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json(rule);
    });

    this.app.post('/api/rules', (req, res) => {
      try {
        const rule = this.rulesEngine.addRule(req.body);
        res.status(201).json(rule);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.put('/api/rules/:ruleId', (req, res) => {
      try {
        req.body.rule_id = req.params.ruleId;
        const rule = this.rulesEngine.addRule(req.body);
        res.json(rule);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.delete('/api/rules/:ruleId', (req, res) => {
      const deleted = this.rulesEngine.deleteRule(req.params.ruleId);
      if (!deleted) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json({ message: 'Rule deleted' });
    });

    this.app.post('/api/rules/:ruleId/toggle', (req, res) => {
      const { enabled } = req.body;
      const rule = this.rulesEngine.toggleRule(req.params.ruleId, enabled);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json(rule);
    });

    this.app.post('/api/rules/:ruleId/test', (req, res) => {
      const result = this.rulesEngine.testRule(req.params.ruleId, req.body);
      res.json(result);
    });

    // Templates endpoints
    this.app.get('/api/templates', (req, res) => {
      const templates = this.rulesEngine.getTemplates();
      res.json({ templates, count: templates.length });
    });

    this.app.post('/api/templates/:templateName', (req, res) => {
      try {
        const rule = this.rulesEngine.createFromTemplate(req.params.templateName, req.body);
        res.status(201).json(rule);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Analytics endpoints
    this.app.get('/api/analytics/occupancy', (req, res) => {
      const stats = this.correlationProcessor.getOccupancyStats();
      res.json(stats);
    });

    this.app.get('/api/analytics/occupancy/:location', (req, res) => {
      const occupied = this.correlationProcessor.getOccupancyState(req.params.location);
      res.json({ location: req.params.location, occupied });
    });

    this.app.get('/api/analytics/delivery-stats', (req, res) => {
      const stats = this.notifier.getDeliveryStats();
      res.json(stats);
    });

    this.app.get('/api/analytics/rule-stats', (req, res) => {
      const stats = this.rulesEngine.getStats();
      res.json(stats);
    });

    // Event injection endpoint (for testing)
    this.app.post('/api/events', async (req, res) => {
      try {
        await this.worker.processEvent(req.body);
        res.json({ message: 'Event processed', event: req.body });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Worker control endpoints
    this.app.post('/api/worker/start', async (req, res) => {
      try {
        await this.worker.start();
        res.json({ message: 'Worker started' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/worker/stop', async (req, res) => {
      try {
        await this.worker.stop();
        res.json({ message: 'Worker stopped' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/worker/metrics', (req, res) => {
      res.json(this.worker.getMetrics());
    });

    this.app.post('/api/worker/metrics/reset', (req, res) => {
      this.worker.resetMetrics();
      res.json({ message: 'Metrics reset' });
    });

    // Anomaly check endpoint
    this.app.post('/api/anomaly/check-failures', (req, res) => {
      const timeoutMinutes = parseInt(req.query.timeout || '10');
      const failures = this.anomalyDetector.checkSensorFailures(timeoutMinutes);
      res.json({ failures, count: failures.length });
    });
  }

  /**
   * Start the service
   */
  async start() {
    console.log('Starting Analytics Service...');

    // Validate configuration
    const validation = this.config.validate();
    if (!validation.valid) {
      console.error('Configuration errors:', validation.errors);
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    // Initialize notifier
    await this.notifier.initialize();

    // Load default rules from templates
    this.loadDefaultRules();

    // Setup API if enabled
    if (this.config.get('api.enabled')) {
      this.setupAPI();
      
      const port = this.config.get('service.port');
      this.server = this.app.listen(port, () => {
        console.log(`API server listening on port ${port}`);
      });
    }

    // Start worker
    await this.worker.start();

    console.log('Analytics Service started successfully');
  }

  /**
   * Stop the service
   */
  async stop() {
    console.log('Stopping Analytics Service...');

    await this.worker.stop();

    if (this.server) {
      this.server.close();
    }

    console.log('Analytics Service stopped');
  }

  /**
   * Load default rules from templates
   */
  loadDefaultRules() {
    const defaultTemplates = [
      'gas_high_critical',
      'gas_high_warning',
      'presence_detected',
      'motion_detected'
    ];

    for (const template of defaultTemplates) {
      try {
        this.rulesEngine.createFromTemplate(template);
        console.log(`Loaded default rule: ${template}`);
      } catch (error) {
        console.warn(`Failed to load default rule ${template}:`, error.message);
      }
    }
  }
}

// Create and start service if running directly
if (require.main === module) {
  const service = new AnalyticsService();
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await service.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await service.stop();
    process.exit(0);
  });

  // Start service
  service.start().catch(error => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

module.exports = AnalyticsService;
