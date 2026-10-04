import { jest } from '@jest/globals';

// Mock modules BEFORE importing app
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    status: 'ready',
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  },
  checkRedisConnection: jest.fn().mockResolvedValue({ isConnected: true }),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule('../../src/repositories/user.repository.js', () => ({
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByIdWithProfiles: jest.fn(),
    updateLastLogin: jest.fn(),
    updatePassword: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/refreshToken.repository.js', () => ({
  default: {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/auditLog.repository.js', () => ({
  default: {
    createLog: jest.fn().mockResolvedValue(null),
  },
}));

const { default: app } = await import('../../src/app.js');
const { default: request } = await import('supertest');
const { generateAccessToken } = await import('../../src/utils/tokens.js');
const { hashPassword } = await import('../../src/utils/passwords.js');
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: refreshTokenRepository } = await import('../../src/repositories/refreshToken.repository.js');

describe('Authentication API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/v1/auth/login - should fail with 422 if body is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Request validation failed');
  });

  test('POST /api/v1/auth/login - should authenticate successfully with valid credentials', async () => {
    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    const mockUser = {
      id: 'test-user-id',
      email: 'teacher@college.edu',
      passwordHash,
      role: 'TEACHER',
      firstName: 'Alan',
      lastName: 'Turing',
      isActive: true,
      teacher: { id: 'teacher-1', departmentId: 'dept-1' },
      student: null,
      headedDepartment: null,
    };

    userRepository.findByEmail.mockResolvedValue(mockUser);
    userRepository.updateLastLogin.mockResolvedValue(mockUser);
    refreshTokenRepository.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@college.edu', password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe('TEACHER');
  });

  test('POST /api/v1/auth/login - should return 401 for wrong password', async () => {
    const passwordHash = await hashPassword('CorrectPassword123');

    userRepository.findByEmail.mockResolvedValue({
      id: 'test-user-id',
      email: 'teacher@college.edu',
      passwordHash,
      role: 'TEACHER',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@college.edu', password: 'WrongPassword!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('GET /api/v1/auth/me - should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/auth/me - should return profile when valid Bearer token is provided', async () => {
    const mockUser = {
      id: 'user-profile-id',
      email: 'principal@college.edu',
      role: 'PRINCIPAL',
      firstName: 'Ada',
      lastName: 'Lovelace',
      isActive: true,
      teacher: null,
      student: null,
      headedDepartment: null,
    };

    userRepository.findByIdWithProfiles.mockResolvedValue(mockUser);

    const token = generateAccessToken({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('principal@college.edu');
    expect(res.body.data.role).toBe('PRINCIPAL');
  });
});
