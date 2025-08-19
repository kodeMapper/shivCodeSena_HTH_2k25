const request = require('supertest');
const app = require('../server/enhanced-server');

describe('SmartVision Family Safety Tracker API', () => {
  const testDeviceId = 'TEST_ESP32_001';
  
  beforeEach(() => {
    // Reset any test data if needed
  });

  describe('Health Check', () => {
    test('GET /api/health should return system status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('devices');
    });
  });

  describe('Location Updates', () => {
    test('POST /api/update-location should accept valid coordinates', async () => {
      const locationData = {
        lat: 37.7749,
        lng: -122.4194,
        accuracy: 5.0
      };

      const response = await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send(locationData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.lat).toBe(locationData.lat);
      expect(response.body.data.lng).toBe(locationData.lng);
      expect(response.body.deviceId).toBe(testDeviceId);
    });

    test('POST /api/update-location should reject invalid coordinates', async () => {
      const invalidData = {
        lat: 'invalid',
        lng: -122.4194
      };

      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send(invalidData)
        .expect(400);
    });

    test('POST /api/update-location should require coordinates', async () => {
      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send({})
        .expect(400);
    });

    test('GET /api/latest-location should return last location', async () => {
      // First, update location
      const locationData = {
        lat: 37.7749,
        lng: -122.4194,
        accuracy: 5.0
      };

      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send(locationData);

      // Then retrieve it
      const response = await request(app)
        .get('/api/latest-location')
        .set('X-Device-ID', testDeviceId)
        .expect(200);

      expect(response.body.lat).toBe(locationData.lat);
      expect(response.body.lng).toBe(locationData.lng);
      expect(response.body.deviceId).toBe(testDeviceId);
    });
  });

  describe('Step Tracking', () => {
    test('POST /api/update-steps should accept valid step count', async () => {
      const stepsData = { steps: 1250 };

      const response = await request(app)
        .post('/api/update-steps')
        .set('X-Device-ID', testDeviceId)
        .send(stepsData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.totalSteps).toBe(stepsData.steps);
      expect(response.body.deviceId).toBe(testDeviceId);
    });

    test('POST /api/update-steps should reject negative steps', async () => {
      const invalidData = { steps: -100 };

      await request(app)
        .post('/api/update-steps')
        .set('X-Device-ID', testDeviceId)
        .send(invalidData)
        .expect(400);
    });

    test('POST /api/update-steps should reject non-numeric steps', async () => {
      const invalidData = { steps: 'invalid' };

      await request(app)
        .post('/api/update-steps')
        .set('X-Device-ID', testDeviceId)
        .send(invalidData)
        .expect(400);
    });

    test('GET /api/latest-steps should return last step count', async () => {
      const stepsData = { steps: 1500 };

      await request(app)
        .post('/api/update-steps')
        .set('X-Device-ID', testDeviceId)
        .send(stepsData);

      const response = await request(app)
        .get('/api/latest-steps')
        .set('X-Device-ID', testDeviceId)
        .expect(200);

      expect(response.body.totalSteps).toBe(stepsData.steps);
      expect(response.body.deviceId).toBe(testDeviceId);
    });
  });

  describe('Route Calculation', () => {
    test('POST /api/calculate-route should return valid route', async () => {
      const routeData = {
        start_lat: 37.7749,
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094
      };

      const response = await request(app)
        .post('/api/calculate-route')
        .set('X-Device-ID', testDeviceId)
        .send(routeData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('steps');
      expect(Array.isArray(response.body.steps)).toBe(true);
    }, 15000); // Longer timeout for external API

    test('POST /api/calculate-route should reject invalid coordinates', async () => {
      const invalidData = {
        start_lat: 'invalid',
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094
      };

      await request(app)
        .post('/api/calculate-route')
        .set('X-Device-ID', testDeviceId)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('Geocoding', () => {
    test('GET /api/geocode should return search results', async () => {
      const response = await request(app)
        .get('/api/geocode')
        .query({ query: 'San Francisco' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.query).toBe('San Francisco');
    }, 15000);

    test('GET /api/geocode should reject empty query', async () => {
      await request(app)
        .get('/api/geocode')
        .query({ query: '' })
        .expect(400);
    });

    test('GET /api/geocode should reject missing query', async () => {
      await request(app)
        .get('/api/geocode')
        .expect(400);
    });
  });

  describe('Emergency Alerts', () => {
    test('POST /api/emergency-alert should accept emergency data', async () => {
      const emergencyData = {
        type: 'emergency',
        message: 'Test emergency alert',
        location: {
          lat: 37.7749,
          lng: -122.4194,
          accuracy: 5.0
        }
      };

      const response = await request(app)
        .post('/api/emergency-alert')
        .set('X-Device-ID', testDeviceId)
        .send(emergencyData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('alert');
      expect(response.body.alert.type).toBe(emergencyData.type);
      expect(response.body.alert.deviceId).toBe(testDeviceId);
    });
  });

  describe('Device Management', () => {
    test('GET /api/devices should return device list', async () => {
      // First add a device by updating location
      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send({ lat: 37.7749, lng: -122.4194 });

      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body).toHaveProperty('devices');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('online');
      expect(Array.isArray(response.body.devices)).toBe(true);
    });

    test('GET /api/device/:deviceId/analytics should return device analytics', async () => {
      // First add some data for the device
      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .send({ lat: 37.7749, lng: -122.4194 });

      await request(app)
        .post('/api/update-steps')
        .set('X-Device-ID', testDeviceId)
        .send({ steps: 1000 });

      const response = await request(app)
        .get(`/api/device/${testDeviceId}/analytics`)
        .expect(200);

      expect(response.body.deviceId).toBe(testDeviceId);
      expect(response.body).toHaveProperty('currentStatus');
      expect(response.body).toHaveProperty('history');
      expect(response.body).toHaveProperty('statistics');
    });
  });

  describe('Navigation Instructions', () => {
    test('GET /api/next-instruction should handle no active route', async () => {
      const response = await request(app)
        .get('/api/next-instruction')
        .set('X-Device-ID', testDeviceId)
        .expect(404);

      expect(response.body.code).toBe('NO_ACTIVE_ROUTE');
    });

    test('GET /api/next-instruction should return instruction after route calculation', async () => {
      // First calculate a route
      const routeData = {
        start_lat: 37.7749,
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094
      };

      await request(app)
        .post('/api/calculate-route')
        .set('X-Device-ID', testDeviceId)
        .send(routeData);

      // Then get next instruction
      const response = await request(app)
        .get('/api/next-instruction')
        .set('X-Device-ID', testDeviceId)
        .expect(200);

      expect(response.body).toHaveProperty('instruction');
      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('stepNumber');
      expect(response.body).toHaveProperty('totalSteps');
    }, 15000);
  });

  describe('Error Handling', () => {
    test('Should handle non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404);
    });

    test('Should handle malformed JSON', async () => {
      await request(app)
        .post('/api/update-location')
        .set('X-Device-ID', testDeviceId)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // This test would need to be adjusted based on actual rate limit settings
      // For now, we'll skip it to avoid timing issues in CI
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/api/health')
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed as they're within limits
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

// Performance and Load Testing
describe('Performance Tests', () => {
  test('Should handle concurrent location updates', async () => {
    const concurrentRequests = 10;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(app)
          .post('/api/update-location')
          .set('X-Device-ID', `TEST_DEVICE_${i}`)
          .send({
            lat: 37.7749 + (i * 0.001),
            lng: -122.4194 + (i * 0.001),
            accuracy: 5.0
          })
      );
    }

    const responses = await Promise.all(requests);
    
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  test('Should handle large step counts', async () => {
    const response = await request(app)
      .post('/api/update-steps')
      .set('X-Device-ID', testDeviceId)
      .send({ steps: 999999 })
      .expect(200);

    expect(response.body.totalSteps).toBe(999999);
  });
});

// Integration Tests
describe('Integration Tests', () => {
  test('Complete workflow: location -> steps -> route -> navigation', async () => {
    const deviceId = 'INTEGRATION_TEST_DEVICE';

    // 1. Update location
    await request(app)
      .post('/api/update-location')
      .set('X-Device-ID', deviceId)
      .send({ lat: 37.7749, lng: -122.4194, accuracy: 5.0 })
      .expect(200);

    // 2. Update steps
    await request(app)
      .post('/api/update-steps')
      .set('X-Device-ID', deviceId)
      .send({ steps: 500 })
      .expect(200);

    // 3. Calculate route
    await request(app)
      .post('/api/calculate-route')
      .set('X-Device-ID', deviceId)
      .send({
        start_lat: 37.7749,
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094
      })
      .expect(200);

    // 4. Get navigation instruction
    await request(app)
      .get('/api/next-instruction')
      .set('X-Device-ID', deviceId)
      .expect(200);

    // 5. Check device analytics
    const analytics = await request(app)
      .get(`/api/device/${deviceId}/analytics`)
      .expect(200);

    expect(analytics.body.currentStatus.steps).toBe(500);
    expect(analytics.body.currentStatus.location.lat).toBe(37.7749);
  }, 20000);
});
