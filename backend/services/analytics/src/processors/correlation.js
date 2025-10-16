/**
 * Correlation Processor
 * Handles event aggregation and multi-sensor correlation
 */

class CorrelationProcessor {
  constructor(alertNotifier) {
    this.alertNotifier = alertNotifier;
    this.eventBuffer = new Map(); // Store events for correlation
    this.correlationWindow = 60000; // 60 seconds window
    this.occupancyState = new Map(); // Track occupancy per location
  }

  /**
   * Process event for correlation with other events
   * @param {Object} event - Sensor event data
   * @returns {Array} - Array of correlation alerts
   */
  async process(event) {
    const alerts = [];

    // Add event to buffer
    this.addToBuffer(event);

    // Clean old events from buffer
    this.cleanBuffer();

    // Run correlation checks
    const correlations = [
      this.detectPresenceWithMotion(event),
      this.detectGasWithOccupancy(event),
      this.detectMultiSensorAnomaly(event),
      this.trackOccupancy(event)
    ].filter(Boolean);

    for (const correlation of correlations) {
      const alert = this.createCorrelationAlert(event, correlation);
      alerts.push(alert);

      if (this.alertNotifier) {
        await this.alertNotifier.notify(alert, correlation.actions || ['webhook']);
      }
    }

    return alerts;
  }

  /**
   * Detect presence sensor and motion sensor correlation
   * @param {Object} event - Current event
   * @returns {Object|null}
   */
  detectPresenceWithMotion(event) {
    if (event.sensor_type !== 'ld2410' && event.sensor_type !== 'pir') {
      return null;
    }

    const location = event.location || event.device_id;
    const recentEvents = this.getRecentEvents(location);

    // Check for both presence and motion detection
    const hasPresence = recentEvents.some(e => 
      e.sensor_type === 'ld2410' && e.value === 1
    );
    const hasMotion = recentEvents.some(e => 
      e.sensor_type === 'pir' && e.value === 1
    );

    if (hasPresence && hasMotion) {
      return {
        type: 'confirmed_occupancy',
        severity: 'info',
        description: 'Both presence and motion detected - confirmed occupancy',
        location: location,
        confidence: 'high',
        actions: ['webhook']
      };
    }

    // Check for presence without motion (possible sensor issue or stationary person)
    if (hasPresence && !hasMotion && recentEvents.length > 5) {
      return {
        type: 'stationary_presence',
        severity: 'info',
        description: 'Presence detected without motion - person may be stationary',
        location: location,
        confidence: 'medium',
        actions: ['webhook']
      };
    }

    return null;
  }

  /**
   * Detect high gas concentration with occupancy
   * @param {Object} event - Current event
   * @returns {Object|null}
   */
  detectGasWithOccupancy(event) {
    if (event.sensor_type !== 'mq134') {
      return null;
    }

    const gasLevel = event.gas_concentration || event.value;
    if (!gasLevel || gasLevel < 300) {
      return null;
    }

    const location = event.location || event.device_id;
    const isOccupied = this.occupancyState.get(location) || false;

    if (isOccupied && gasLevel > 500) {
      return {
        type: 'gas_with_occupancy',
        severity: 'critical',
        description: `High gas concentration (${gasLevel}) detected in occupied space`,
        location: location,
        gas_level: gasLevel,
        occupied: true,
        actions: ['email', 'sms', 'webhook']
      };
    } else if (isOccupied && gasLevel > 300) {
      return {
        type: 'gas_with_occupancy',
        severity: 'warning',
        description: `Elevated gas concentration (${gasLevel}) detected in occupied space`,
        location: location,
        gas_level: gasLevel,
        occupied: true,
        actions: ['email', 'webhook']
      };
    }

    return null;
  }

  /**
   * Detect anomalies across multiple sensors
   * @param {Object} event - Current event
   * @returns {Object|null}
   */
  detectMultiSensorAnomaly(event) {
    const location = event.location || event.device_id;
    const recentEvents = this.getRecentEvents(location);

    if (recentEvents.length < 3) {
      return null;
    }

    // Count different sensor types reporting in the time window
    const sensorTypes = new Set(recentEvents.map(e => e.sensor_type));

    // If multiple sensors are active, check for coordinated anomalies
    if (sensorTypes.size >= 2) {
      const anomalyEvents = recentEvents.filter(e => 
        e.anomaly_type || e.alert_level === 'critical'
      );

      if (anomalyEvents.length >= 2) {
        return {
          type: 'multi_sensor_anomaly',
          severity: 'high',
          description: `Multiple sensors reporting anomalies in ${location}`,
          location: location,
          affected_sensors: Array.from(sensorTypes),
          event_count: anomalyEvents.length,
          actions: ['email', 'webhook']
        };
      }
    }

    return null;
  }

  /**
   * Track occupancy based on sensor data
   * @param {Object} event - Current event
   * @returns {Object|null}
   */
  trackOccupancy(event) {
    const location = event.location || event.device_id;
    const previousState = this.occupancyState.get(location) || false;

    let newState = previousState;

    // Update occupancy based on presence sensor
    if (event.sensor_type === 'ld2410') {
      newState = event.value === 1 || event.presence === true;
    }

    // Update occupancy based on motion sensor
    if (event.sensor_type === 'pir') {
      if (event.value === 1 || event.motion === true) {
        newState = true;
      }
    }

    // Update state
    this.occupancyState.set(location, newState);

    // Return alert on state change
    if (newState !== previousState) {
      return {
        type: 'occupancy_change',
        severity: 'info',
        description: newState ? 'Space occupied' : 'Space vacated',
        location: location,
        occupied: newState,
        previous_state: previousState,
        actions: ['webhook']
      };
    }

    return null;
  }

  /**
   * Get recent events for a location
   * @param {String} location - Location identifier
   * @returns {Array}
   */
  getRecentEvents(location) {
    const events = this.eventBuffer.get(location) || [];
    const now = Date.now();
    
    // Return events within correlation window
    return events.filter(e => now - e.timestamp < this.correlationWindow);
  }

  /**
   * Add event to buffer
   * @param {Object} event - Event data
   */
  addToBuffer(event) {
    const location = event.location || event.device_id;
    
    if (!this.eventBuffer.has(location)) {
      this.eventBuffer.set(location, []);
    }

    const buffer = this.eventBuffer.get(location);
    buffer.push({
      ...event,
      timestamp: Date.now()
    });

    // Limit buffer size per location
    if (buffer.length > 100) {
      buffer.shift();
    }
  }

  /**
   * Clean old events from buffer
   */
  cleanBuffer() {
    const now = Date.now();
    
    for (const [location, events] of this.eventBuffer.entries()) {
      const recentEvents = events.filter(e => 
        now - e.timestamp < this.correlationWindow * 2
      );
      
      if (recentEvents.length === 0) {
        this.eventBuffer.delete(location);
      } else {
        this.eventBuffer.set(location, recentEvents);
      }
    }
  }

  /**
   * Get current occupancy state for a location
   * @param {String} location - Location identifier
   * @returns {Boolean}
   */
  getOccupancyState(location) {
    return this.occupancyState.get(location) || false;
  }

  /**
   * Get occupancy statistics
   * @returns {Object}
   */
  getOccupancyStats() {
    const stats = {
      total_locations: this.occupancyState.size,
      occupied_count: 0,
      vacant_count: 0,
      locations: {}
    };

    for (const [location, occupied] of this.occupancyState.entries()) {
      if (occupied) {
        stats.occupied_count++;
      } else {
        stats.vacant_count++;
      }
      stats.locations[location] = occupied;
    }

    return stats;
  }

  /**
   * Create correlation alert object
   * @param {Object} event - Original event
   * @param {Object} correlation - Correlation details
   * @returns {Object}
   */
  createCorrelationAlert(event, correlation) {
    return {
      alert_id: this.generateAlertId(),
      rule_id: `correlation_${correlation.type}`,
      alert_level: this.mapSeverity(correlation.severity),
      sensor_type: event.sensor_type,
      device_id: event.device_id,
      location: correlation.location,
      timestamp: new Date().toISOString(),
      correlation_type: correlation.type,
      description: correlation.description,
      data: {
        ...correlation,
        trigger_event: event
      }
    };
  }

  /**
   * Map severity to alert level
   * @param {String} severity - Severity level
   * @returns {String}
   */
  mapSeverity(severity) {
    const mapping = {
      'critical': 'critical',
      'high': 'critical',
      'medium': 'warning',
      'low': 'info',
      'info': 'info'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Generate unique alert ID
   * @returns {String}
   */
  generateAlertId() {
    return `correlation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear buffer for a location
   * @param {String} location - Location identifier
   */
  clearBuffer(location) {
    this.eventBuffer.delete(location);
    this.occupancyState.delete(location);
  }

  /**
   * Clear all buffers
   */
  clearAllBuffers() {
    this.eventBuffer.clear();
    this.occupancyState.clear();
  }
}

module.exports = CorrelationProcessor;
