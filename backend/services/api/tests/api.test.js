const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate test tokens
const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const userToken = jwt.sign({ userId: 'user-1', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

let createdDevice;
let deviceApiKey;

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should accept valid JWT token', async () => {
      await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Device Management', () => {
    it('should register a new device (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Device',
          type: 'sensor_hub',
          location: {
            building: 'Test Building',
            floor: '1'
          },
          sensors: [
            { type: 'ld2410', model: 'LD2410C' }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device).toHaveProperty('id');
      expect(response.body.data.device).toHaveProperty('api_key');
      
      // Store for later tests
      createdDevice = response.body.data.device;
      deviceApiKey = response.body.data.device.api_key;
    });

    it('should not allow non-admin to register device', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Device',
          type: 'sensor_hub'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should list all devices', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('devices');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should get device details', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${createdDevice.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device.name).toBe('Test Device');
      // API key should be removed from response
      expect(response.body.data.device).not.toHaveProperty('api_key');
    });
  });

  describe('Sensor Data', () => {
    it('should allow device to submit sensor data', async () => {
      const response = await request(app)
        .post('/api/v1/data/submit')
        .set('x-api-key', deviceApiKey)
        .send({
          device_id: createdDevice.id,
          readings: [
            {
              sensor_type: 'ld2410',
              values: {
                presence: true,
                moving_distance: 150,
                static_distance: 120
              }
            }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should query sensor data', async () => {
      const response = await request(app)
        .get(`/api/v1/data/sensors?device_id=${createdDevice.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.readings).toBeInstanceOf(Array);
    });

    it('should get latest readings', async () => {
      const response = await request(app)
        .get('/api/v1/data/latest')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('readings');
      expect(response.body.data).toHaveProperty('total_devices');
    });
  });

  describe('System Health', () => {
    it('should return health status without auth', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    it('should return metrics for authenticated users', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
    });
  });
});
