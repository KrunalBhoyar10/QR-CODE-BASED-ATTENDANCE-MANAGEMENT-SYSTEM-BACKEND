import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redis: { ping: jest.fn().mockResolvedValue('PONG'), status: 'ready', on: jest.fn(), quit: jest.fn().mockResolvedValue('OK') },
  checkRedisConnection: jest.fn().mockResolvedValue({ isConnected: true }),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule('../../src/repositories/user.repository.js', () => ({
  default: { findByIdWithProfiles: jest.fn(), findByEmail: jest.fn() },
}));

jest.unstable_mockModule('../../src/repositories/department.repository.js', () => ({
  default: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/auditLog.repository.js', () => ({
  default: { createLog: jest.fn().mockResolvedValue(null) },
}));

const { default: app } = await import('../../src/app.js');
const { default: request } = await import('supertest');
const { generateAccessToken } = await import('../../src/utils/tokens.js');
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: departmentRepository } = await import('../../src/repositories/department.repository.js');

describe('Academic Hierarchy Endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  const principalToken = generateAccessToken({ id: 'principal-uuid-1', email: 'principal@college.edu', role: 'PRINCIPAL' });
  const studentToken = generateAccessToken({ id: 'student-uuid-1', email: 'student@college.edu', role: 'STUDENT' });

  test('GET /api/v1/academic/departments - should return 401 if unauthenticated', async () => {
    const res = await request(app).get('/api/v1/academic/departments');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/v1/academic/departments - should forbid STUDENT (403)', async () => {
    userRepository.findByIdWithProfiles.mockResolvedValue({
      id: 'student-uuid-1',
      email: 'student@college.edu',
      role: 'STUDENT',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/v1/academic/departments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Computer Science', code: 'CS' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access forbidden');
  });

  test('POST /api/v1/academic/departments - should allow PRINCIPAL (201)', async () => {
    userRepository.findByIdWithProfiles.mockResolvedValue({
      id: 'principal-uuid-1',
      email: 'principal@college.edu',
      role: 'PRINCIPAL',
      isActive: true,
    });

    departmentRepository.findByCode.mockResolvedValue(null);
    departmentRepository.create.mockResolvedValue({
      id: 'dept-uuid-1',
      name: 'Computer Science',
      code: 'CS',
      description: 'Department of CS',
    });

    const res = await request(app)
      .post('/api/v1/academic/departments')
      .set('Authorization', `Bearer ${principalToken}`)
      .send({ name: 'Computer Science', code: 'CS', description: 'Department of CS' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Computer Science');
  });

  test('GET /api/v1/academic/departments - should return department list', async () => {
    userRepository.findByIdWithProfiles.mockResolvedValue({
      id: 'principal-uuid-1',
      email: 'principal@college.edu',
      role: 'PRINCIPAL',
      isActive: true,
    });

    departmentRepository.findAll.mockResolvedValue([
      { id: 'dept-1', name: 'Computer Science', code: 'CS', _count: { programs: 2 } },
      { id: 'dept-2', name: 'Information Technology', code: 'IT', _count: { programs: 1 } },
    ]);

    const res = await request(app)
      .get('/api/v1/academic/departments')
      .set('Authorization', `Bearer ${principalToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});
