const request = require('supertest');
const app = require('../src/index');

describe('Health Endpoints', () => {
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('should include version information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('environment');
    });
  });
});
