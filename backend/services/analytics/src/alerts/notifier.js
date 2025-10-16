/**
 * Alert Notifier
 * Handles sending alerts through multiple channels
 */

const axios = require('axios');

class AlertNotifier {
  constructor(config = {}) {
    this.config = config;
    this.emailClient = null;
    this.smsClient = null;
    this.alertHistory = new Map(); // For deduplication
    this.deliveryTracking = []; // Track delivery status
  }

  /**
   * Initialize notification clients
   */
  async initialize() {
    // Initialize email client if configured
    if (this.config.email?.enabled) {
      try {
        const nodemailer = require('nodemailer');
        this.emailClient = nodemailer.createTransport({
          host: this.config.email.smtp_host,
          port: this.config.email.smtp_port || 587,
          secure: this.config.email.smtp_secure || false,
          auth: {
            user: this.config.email.smtp_user,
            pass: this.config.email.smtp_pass
          }
        });
      } catch (error) {
        console.error('Failed to initialize email client:', error);
      }
    }

    // Initialize SMS client if configured
    if (this.config.sms?.enabled && this.config.sms.twilio_account_sid) {
      try {
        const twilio = require('twilio');
        this.smsClient = twilio(
          this.config.sms.twilio_account_sid,
          this.config.sms.twilio_auth_token
        );
      } catch (error) {
        console.error('Failed to initialize SMS client:', error);
      }
    }
  }

  /**
   * Send notifications for an alert
   * @param {Object} alert - Alert data
   * @param {Array} actions - Array of notification channels
   * @returns {Object} - Delivery results
   */
  async notify(alert, actions = []) {
    const results = {
      alert_id: alert.alert_id,
      timestamp: new Date().toISOString(),
      deliveries: []
    };

    // Check for duplicate alert
    if (this.isDuplicate(alert)) {
      console.log(`Skipping duplicate alert: ${alert.alert_id}`);
      return results;
    }

    // Record alert
    this.recordAlert(alert);

    // Send through each channel
    for (const action of actions) {
      try {
        let delivery = null;

        switch (action.toLowerCase()) {
          case 'email':
            delivery = await this.sendEmail(alert);
            break;
          case 'webhook':
            delivery = await this.sendWebhook(alert);
            break;
          case 'sms':
            delivery = await this.sendSMS(alert);
            break;
          case 'push':
            delivery = await this.sendPushNotification(alert);
            break;
          default:
            console.warn(`Unknown notification action: ${action}`);
        }

        if (delivery) {
          results.deliveries.push(delivery);
          this.trackDelivery(delivery);
        }
      } catch (error) {
        console.error(`Error sending ${action} notification:`, error);
        results.deliveries.push({
          channel: action,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Send email notification
   * @param {Object} alert - Alert data
   * @returns {Object}
   */
  async sendEmail(alert) {
    if (!this.emailClient || !this.config.email?.recipients) {
      console.warn('Email client not configured');
      return {
        channel: 'email',
        status: 'skipped',
        reason: 'not_configured',
        timestamp: new Date().toISOString()
      };
    }

    const subject = this.formatEmailSubject(alert);
    const body = this.formatEmailBody(alert);

    try {
      const info = await this.emailClient.sendMail({
        from: this.config.email.from_address || 'alerts@neurobuildtech.com',
        to: this.config.email.recipients.join(', '),
        subject: subject,
        text: body,
        html: this.formatEmailHtml(alert)
      });

      return {
        channel: 'email',
        status: 'sent',
        recipients: this.config.email.recipients,
        message_id: info.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Send webhook notification
   * @param {Object} alert - Alert data
   * @returns {Object}
   */
  async sendWebhook(alert) {
    const webhookUrls = this.config.webhook?.urls || [];

    if (webhookUrls.length === 0) {
      return {
        channel: 'webhook',
        status: 'skipped',
        reason: 'no_urls_configured',
        timestamp: new Date().toISOString()
      };
    }

    const results = [];

    for (const url of webhookUrls) {
      try {
        const response = await axios.post(url, {
          alert: alert,
          timestamp: new Date().toISOString(),
          event_type: 'sensor_alert'
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Alert-ID': alert.alert_id
          }
        });

        results.push({
          url: url,
          status: 'success',
          status_code: response.status
        });
      } catch (error) {
        results.push({
          url: url,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      channel: 'webhook',
      status: results.every(r => r.status === 'success') ? 'sent' : 'partial',
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send SMS notification
   * @param {Object} alert - Alert data
   * @returns {Object}
   */
  async sendSMS(alert) {
    if (!this.smsClient || !this.config.sms?.recipients) {
      return {
        channel: 'sms',
        status: 'skipped',
        reason: 'not_configured',
        timestamp: new Date().toISOString()
      };
    }

    const message = this.formatSMSMessage(alert);
    const results = [];

    for (const recipient of this.config.sms.recipients) {
      try {
        const result = await this.smsClient.messages.create({
          body: message,
          from: this.config.sms.twilio_phone_number,
          to: recipient
        });

        results.push({
          recipient: recipient,
          status: 'sent',
          sid: result.sid
        });
      } catch (error) {
        results.push({
          recipient: recipient,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      channel: 'sms',
      status: results.every(r => r.status === 'sent') ? 'sent' : 'partial',
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send push notification (placeholder for future implementation)
   * @param {Object} alert - Alert data
   * @returns {Object}
   */
  async sendPushNotification(alert) {
    // Placeholder for push notification implementation
    // Can be integrated with Firebase Cloud Messaging, OneSignal, etc.
    return {
      channel: 'push',
      status: 'not_implemented',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format email subject
   * @param {Object} alert - Alert data
   * @returns {String}
   */
  formatEmailSubject(alert) {
    const level = alert.alert_level?.toUpperCase() || 'ALERT';
    const device = alert.device_id || 'Unknown';
    return `[${level}] Sensor Alert - ${device}`;
  }

  /**
   * Format email body
   * @param {Object} alert - Alert data
   * @returns {String}
   */
  formatEmailBody(alert) {
    return `
Sensor Alert Notification
=========================

Alert Level: ${alert.alert_level}
Alert ID: ${alert.alert_id}
Device ID: ${alert.device_id}
Sensor Type: ${alert.sensor_type}
Timestamp: ${alert.timestamp}

${alert.message || alert.description || 'No description available'}

${alert.condition ? `Condition: ${alert.condition}` : ''}
${alert.value !== undefined ? `Value: ${alert.value}` : ''}

---
This is an automated alert from NeuroBuildTech Analytics Service.
    `.trim();
  }

  /**
   * Format email HTML body
   * @param {Object} alert - Alert data
   * @returns {String}
   */
  formatEmailHtml(alert) {
    const levelColor = {
      'critical': '#dc2626',
      'warning': '#f59e0b',
      'info': '#3b82f6'
    }[alert.alert_level] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .alert-box { border-left: 4px solid ${levelColor}; padding: 15px; background: #f9fafb; }
    .alert-level { color: ${levelColor}; font-weight: bold; font-size: 18px; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="alert-box">
    <div class="alert-level">${alert.alert_level?.toUpperCase() || 'ALERT'}</div>
    <div class="detail"><span class="label">Alert ID:</span> ${alert.alert_id}</div>
    <div class="detail"><span class="label">Device ID:</span> ${alert.device_id}</div>
    <div class="detail"><span class="label">Sensor Type:</span> ${alert.sensor_type}</div>
    <div class="detail"><span class="label">Timestamp:</span> ${alert.timestamp}</div>
    <div class="detail">
      <p>${alert.message || alert.description || 'No description available'}</p>
    </div>
    ${alert.condition ? `<div class="detail"><span class="label">Condition:</span> ${alert.condition}</div>` : ''}
    ${alert.value !== undefined ? `<div class="detail"><span class="label">Value:</span> ${alert.value}</div>` : ''}
  </div>
  <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
    This is an automated alert from NeuroBuildTech Analytics Service.
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Format SMS message
   * @param {Object} alert - Alert data
   * @returns {String}
   */
  formatSMSMessage(alert) {
    const level = alert.alert_level?.toUpperCase() || 'ALERT';
    const device = alert.device_id || 'Unknown';
    const msg = alert.message || alert.description || 'Alert triggered';
    return `[${level}] ${device}: ${msg}`.substring(0, 160); // SMS limit
  }

  /**
   * Check if alert is duplicate
   * @param {Object} alert - Alert data
   * @returns {Boolean}
   */
  isDuplicate(alert) {
    const key = this.generateAlertKey(alert);
    const lastAlert = this.alertHistory.get(key);

    if (!lastAlert) {
      return false;
    }

    // Consider duplicate if same alert within 5 minutes
    const timeDiff = Date.now() - lastAlert.timestamp;
    return timeDiff < 300000; // 5 minutes
  }

  /**
   * Record alert for deduplication
   * @param {Object} alert - Alert data
   */
  recordAlert(alert) {
    const key = this.generateAlertKey(alert);
    this.alertHistory.set(key, {
      alert_id: alert.alert_id,
      timestamp: Date.now()
    });

    // Clean old entries (older than 1 hour)
    this.cleanAlertHistory();
  }

  /**
   * Generate key for alert deduplication
   * @param {Object} alert - Alert data
   * @returns {String}
   */
  generateAlertKey(alert) {
    return `${alert.rule_id || 'unknown'}_${alert.device_id}_${alert.alert_level}`;
  }

  /**
   * Clean old alert history
   */
  cleanAlertHistory() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    for (const [key, data] of this.alertHistory.entries()) {
      if (data.timestamp < oneHourAgo) {
        this.alertHistory.delete(key);
      }
    }
  }

  /**
   * Track delivery for monitoring
   * @param {Object} delivery - Delivery result
   */
  trackDelivery(delivery) {
    this.deliveryTracking.push({
      ...delivery,
      tracked_at: Date.now()
    });

    // Limit tracking history
    if (this.deliveryTracking.length > 1000) {
      this.deliveryTracking.shift();
    }
  }

  /**
   * Get delivery statistics
   * @returns {Object}
   */
  getDeliveryStats() {
    const stats = {
      total: this.deliveryTracking.length,
      by_channel: {},
      by_status: {}
    };

    for (const delivery of this.deliveryTracking) {
      // Count by channel
      const channel = delivery.channel;
      stats.by_channel[channel] = (stats.by_channel[channel] || 0) + 1;

      // Count by status
      const status = delivery.status;
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear delivery tracking
   */
  clearDeliveryTracking() {
    this.deliveryTracking = [];
  }
}

module.exports = AlertNotifier;
