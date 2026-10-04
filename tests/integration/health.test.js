import { jest } from '@jest/globals';

// Mock modules BEFORE importing app
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue({ isConnected: true, message: 'Connected' }),
}));

jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    status: 'ready',
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  },
  checkRedisConnection: jest.fn().mockResolvedValue({ isConnected: true, message: 'Redis is operational' }),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
}));

const { default: app } = await import('../../src/app.js');
const { default: request } = await import('supertest');

describe('Health and Root API Endpoints', () => {
  test('GET / should return welcome message and routes', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.healthCheck).toBe('/health');
  });

  test('GET /health should return 200 and healthy status when DB is connected', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.services.database.status).toBe('connected');
  });

  test('GET /api/v1 should return API root metadata', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe('1.0.0');
  });

  test('GET /unknown-route should return 404 with standard error format', async () => {
    const res = await request(app).get('/some-nonexistent-endpoint');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Route GET /some-nonexistent-endpoint not found');
  });
});
