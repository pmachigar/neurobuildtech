/**
 * Anomaly Detector
 * Detects unusual patterns and sensor failures
 */

class AnomalyDetector {
  constructor(alertNotifier) {
    this.alertNotifier = alertNotifier;
    this.sensorHistory = new Map(); // Store recent sensor readings
    this.maxHistorySize = 100;
    this.sensorLastSeen = new Map(); // Track sensor activity
  }

  /**
   * Process sensor data for anomalies
   * @param {Object} sensorData - Sensor reading data
   * @returns {Array} - Array of anomaly alerts
   */
  async process(sensorData) {
    const alerts = [];
    const deviceId = sensorData.device_id;

    // Update sensor activity tracking
    this.updateSensorActivity(deviceId);

    // Store history
    this.addToHistory(deviceId, sensorData);

    // Run anomaly detection checks
    const anomalies = [
      this.detectSuddenSpike(deviceId, sensorData),
      this.detectSuddenDrop(deviceId, sensorData),
      this.detectFlatline(deviceId, sensorData),
      this.detectOutOfRange(deviceId, sensorData),
      this.detectRapidFluctuation(deviceId, sensorData)
    ].filter(Boolean);

    for (const anomaly of anomalies) {
      const alert = this.createAnomalyAlert(sensorData, anomaly);
      alerts.push(alert);

      if (this.alertNotifier) {
        await this.alertNotifier.notify(alert, ['email', 'webhook']);
      }
    }

    return alerts;
  }

  /**
   * Check for sensor failures (no data received)
   * @param {Number} timeoutMinutes - Minutes of inactivity to consider failed
   * @returns {Array} - Array of failure alerts
   */
  checkSensorFailures(timeoutMinutes = 10) {
    const alerts = [];
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    for (const [deviceId, lastSeen] of this.sensorLastSeen.entries()) {
      if (now - lastSeen > timeoutMs) {
        alerts.push({
          alert_id: this.generateAlertId(),
          alert_level: 'critical',
          type: 'sensor_failure',
          device_id: deviceId,
          timestamp: new Date().toISOString(),
          message: `Sensor ${deviceId} has not reported data for ${timeoutMinutes} minutes`,
          last_seen: new Date(lastSeen).toISOString()
        });
      }
    }

    return alerts;
  }

  /**
   * Detect sudden spike in sensor value
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Current sensor data
   * @returns {Object|null}
   */
  detectSuddenSpike(deviceId, data) {
    const history = this.getHistory(deviceId);
    if (history.length < 5) return null;

    const currentValue = this.extractNumericValue(data);
    if (currentValue === null) return null;

    const recentValues = history.slice(-5).map(d => this.extractNumericValue(d));
    const avg = this.calculateAverage(recentValues);
    const stdDev = this.calculateStdDev(recentValues, avg);

    // Detect if current value is more than 3 standard deviations above average
    if (stdDev > 0 && currentValue > avg + (3 * stdDev)) {
      return {
        type: 'sudden_spike',
        severity: 'high',
        description: `Value spiked to ${currentValue} (avg: ${avg.toFixed(2)}, stddev: ${stdDev.toFixed(2)})`,
        value: currentValue,
        expected_range: [avg - stdDev, avg + stdDev]
      };
    }

    return null;
  }

  /**
   * Detect sudden drop in sensor value
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Current sensor data
   * @returns {Object|null}
   */
  detectSuddenDrop(deviceId, data) {
    const history = this.getHistory(deviceId);
    if (history.length < 5) return null;

    const currentValue = this.extractNumericValue(data);
    if (currentValue === null) return null;

    const recentValues = history.slice(-5).map(d => this.extractNumericValue(d));
    const avg = this.calculateAverage(recentValues);
    const stdDev = this.calculateStdDev(recentValues, avg);

    // Detect if current value is more than 3 standard deviations below average
    if (stdDev > 0 && currentValue < avg - (3 * stdDev)) {
      return {
        type: 'sudden_drop',
        severity: 'high',
        description: `Value dropped to ${currentValue} (avg: ${avg.toFixed(2)}, stddev: ${stdDev.toFixed(2)})`,
        value: currentValue,
        expected_range: [avg - stdDev, avg + stdDev]
      };
    }

    return null;
  }

  /**
   * Detect flatline (no variation in values)
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Current sensor data
   * @returns {Object|null}
   */
  detectFlatline(deviceId, data) {
    const history = this.getHistory(deviceId);
    if (history.length < 10) return null;

    const recentValues = history.slice(-10).map(d => this.extractNumericValue(d));
    const uniqueValues = new Set(recentValues);

    // If all values are identical, it's likely a flatline/stuck sensor
    if (uniqueValues.size === 1) {
      return {
        type: 'flatline',
        severity: 'medium',
        description: `Sensor reporting constant value: ${recentValues[0]}`,
        value: recentValues[0]
      };
    }

    return null;
  }

  /**
   * Detect out of range values
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Current sensor data
   * @returns {Object|null}
   */
  detectOutOfRange(deviceId, data) {
    const value = this.extractNumericValue(data);
    if (value === null) return null;

    // Define reasonable ranges for different sensor types
    const ranges = {
      'mq134': { min: 0, max: 1000 },
      'ld2410': { min: 0, max: 1 },
      'pir': { min: 0, max: 1 },
      'temperature': { min: -40, max: 85 },
      'humidity': { min: 0, max: 100 }
    };

    const sensorType = data.sensor_type;
    const range = ranges[sensorType];

    if (range && (value < range.min || value > range.max)) {
      return {
        type: 'out_of_range',
        severity: 'high',
        description: `Value ${value} is outside valid range [${range.min}, ${range.max}]`,
        value: value,
        valid_range: range
      };
    }

    return null;
  }

  /**
   * Detect rapid fluctuation
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Current sensor data
   * @returns {Object|null}
   */
  detectRapidFluctuation(deviceId, data) {
    const history = this.getHistory(deviceId);
    if (history.length < 10) return null;

    const recentValues = history.slice(-10).map(d => this.extractNumericValue(d));
    
    // Calculate rate of change
    let totalChange = 0;
    for (let i = 1; i < recentValues.length; i++) {
      totalChange += Math.abs(recentValues[i] - recentValues[i - 1]);
    }

    const avgChange = totalChange / (recentValues.length - 1);
    const avg = this.calculateAverage(recentValues);

    // If average change is more than 20% of the average value, flag as rapid fluctuation
    if (avg > 0 && avgChange > avg * 0.2) {
      return {
        type: 'rapid_fluctuation',
        severity: 'medium',
        description: `Sensor values fluctuating rapidly (avg change: ${avgChange.toFixed(2)})`,
        avg_change: avgChange,
        avg_value: avg
      };
    }

    return null;
  }

  /**
   * Add data to history
   * @param {String} deviceId - Device identifier
   * @param {Object} data - Sensor data
   */
  addToHistory(deviceId, data) {
    if (!this.sensorHistory.has(deviceId)) {
      this.sensorHistory.set(deviceId, []);
    }

    const history = this.sensorHistory.get(deviceId);
    history.push({ ...data, timestamp: Date.now() });

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get history for device
   * @param {String} deviceId - Device identifier
   * @returns {Array}
   */
  getHistory(deviceId) {
    return this.sensorHistory.get(deviceId) || [];
  }

  /**
   * Update sensor activity tracking
   * @param {String} deviceId - Device identifier
   */
  updateSensorActivity(deviceId) {
    this.sensorLastSeen.set(deviceId, Date.now());
  }

  /**
   * Extract numeric value from sensor data
   * @param {Object} data - Sensor data
   * @returns {Number|null}
   */
  extractNumericValue(data) {
    // Try common field names
    const fields = ['value', 'reading', 'gas_concentration', 'temperature', 'humidity', 'distance'];
    
    for (const field of fields) {
      if (typeof data[field] === 'number') {
        return data[field];
      }
    }

    return null;
  }

  /**
   * Calculate average of array
   * @param {Array} values - Numeric values
   * @returns {Number}
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   * @param {Array} values - Numeric values
   * @param {Number} avg - Average value
   * @returns {Number}
   */
  calculateStdDev(values, avg) {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Create anomaly alert object
   * @param {Object} data - Sensor data
   * @param {Object} anomaly - Anomaly details
   * @returns {Object}
   */
  createAnomalyAlert(data, anomaly) {
    return {
      alert_id: this.generateAlertId(),
      rule_id: `anomaly_${anomaly.type}`,
      alert_level: anomaly.severity === 'high' ? 'critical' : 'warning',
      sensor_type: data.sensor_type,
      device_id: data.device_id,
      timestamp: new Date().toISOString(),
      anomaly_type: anomaly.type,
      description: anomaly.description,
      data: {
        ...anomaly,
        sensor_data: data
      }
    };
  }

  /**
   * Generate unique alert ID
   * @returns {String}
   */
  generateAlertId() {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear history for a device
   * @param {String} deviceId - Device identifier
   */
  clearHistory(deviceId) {
    this.sensorHistory.delete(deviceId);
    this.sensorLastSeen.delete(deviceId);
  }

  /**
   * Clear all history
   */
  clearAllHistory() {
    this.sensorHistory.clear();
    this.sensorLastSeen.clear();
  }
}

module.exports = AnomalyDetector;
