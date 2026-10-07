import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────
// Mock Prisma & Redis BEFORE dynamic imports
// ─────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
    $transaction: jest.fn(async (cb) =>
      cb({
        attendanceRecord: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        attendanceSession: {
          update: jest.fn(),
        },
      })
    ),
    attendanceSession: {
      update: jest.fn(),
    },
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue({ isConnected: true }),
}));

const mockGetCache = jest.fn();
const mockSetCache = jest.fn();
const mockDeleteCache = jest.fn();

jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    status: 'ready',
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  },
  checkRedisConnection: jest.fn().mockResolvedValue({ isConnected: true }),
  getCache: mockGetCache,
  setCache: mockSetCache,
  deleteCache: mockDeleteCache,
}));

// ─────────────────────────────────────────────────────────
// Mock Repositories
// ─────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/repositories/user.repository.js', () => ({
  default: {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByIdWithProfiles: jest.fn(),
    update: jest.fn(),
    updatePasswordWithFlag: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/student.repository.js', () => ({
  default: {
    findStudentByUserId: jest.fn(),
    findStudentById: jest.fn(),
    updateStudentProfile: jest.fn(),
    findEnrollmentsByStudent: jest.fn(),
    findActiveEnrollment: jest.fn(),
    findSessionById: jest.fn(),
    findAttendanceRecord: jest.fn(),
    createAttendanceRecordInTx: jest.fn(),
    getStudentAttendanceSummary: jest.fn(),
    getStudentSubjectWiseAttendance: jest.fn(),
    getStudentAttendanceHistory: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/passwordResetToken.repository.js', () => ({
  default: {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn(),
    revokeAllForUser: jest.fn().mockResolvedValue(true),
    deleteExpiredTokens: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/refreshToken.repository.js', () => ({
  default: {
    create: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllForUser: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule('../../src/repositories/auditLog.repository.js', () => ({
  default: {
    createLog: jest.fn().mockResolvedValue(null),
  },
}));

// ─────────────────────────────────────────────────────────
// Dynamic Imports (after mocks)
// ─────────────────────────────────────────────────────────
const { default: app } = await import('../../src/app.js');
const { default: request } = await import('supertest');
const { generateAccessToken, hashToken } = await import('../../src/utils/tokens.js');
const { hashPassword } = await import('../../src/utils/passwords.js');
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: studentRepository } = await import('../../src/repositories/student.repository.js');
const { default: passwordResetTokenRepository } = await import('../../src/repositories/passwordResetToken.repository.js');
const { prisma } = await import('../../src/lib/prisma.js');

// ─────────────────────────────────────────────────────────
// Test Data Constants (Valid RFC4122 v4 UUIDs)
// ─────────────────────────────────────────────────────────
const STUDENT_USER_ID   = '11111111-1111-4111-8111-111111111111';
const STUDENT_PROFILE_ID= '22222222-2222-4222-8222-222222222222';
const TEACHER_USER_ID   = '33333333-3333-4333-8333-333333333333';
const SESSION_ID        = '44444444-4444-4444-8444-444444444444';
const DEPT_BCA_ID       = '55555555-5555-4555-8555-555555555555';
const DEPT_MCA_ID       = '66666666-6666-4666-8666-666666666666';
const PROG_BCA_ID       = '77777777-7777-4777-8777-777777777777';
const PROG_MCA_ID       = '88888888-8888-4888-8888-888888888888';
const YEAR_1ST_ID       = '99999999-9999-4999-8999-999999999999';
const YEAR_2ND_ID       = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEC_A_ID          = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SEC_B_ID          = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SUBJECT_ID        = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const MOCK_SESSION_TOKEN = 'valid-qr-session-token-12345';
const MOCK_TOKEN_HASH = hashToken(MOCK_SESSION_TOKEN);

describe('Student Backend Module & Attendance Marking Flow Integration Tests', () => {
  let studentAccessToken;
  let teacherAccessToken;
  let mockStudentUser;
  let mockStudentProfile;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    studentAccessToken = generateAccessToken({
      id: STUDENT_USER_ID,
      email: 'student@college.edu',
      role: 'STUDENT',
      studentId: STUDENT_PROFILE_ID,
      departmentId: DEPT_BCA_ID,
    });

    teacherAccessToken = generateAccessToken({
      id: TEACHER_USER_ID,
      email: 'teacher@college.edu',
      role: 'TEACHER',
    });

    mockStudentProfile = {
      id: STUDENT_PROFILE_ID,
      userId: STUDENT_USER_ID,
      rollNumber: 'BCA-2026-001',
      enrollmentNumber: 'EN2026001',
      departmentId: DEPT_BCA_ID,
      programId: PROG_BCA_ID,
      academicYearId: YEAR_1ST_ID,
      sectionId: SEC_A_ID,
      user: {
        id: STUDENT_USER_ID,
        email: 'student@college.edu',
        role: 'STUDENT',
        firstName: 'Alex',
        lastName: 'Smith',
        phoneNumber: '9876543210',
        avatarUrl: null,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      department: { id: DEPT_BCA_ID, name: 'Computer Applications', code: 'CA' },
      program: { id: PROG_BCA_ID, name: 'Bachelor of Computer Applications', code: 'BCA', durationYears: 3, isActive: true },
      academicYear: { id: YEAR_1ST_ID, yearNumber: 1, label: '1st Year' },
      section: { id: SEC_A_ID, name: 'A', capacity: 60 },
      enrollments: [
        {
          id: 'enr-1',
          academicSession: '2026-2027',
          academicYearId: YEAR_1ST_ID,
          sectionId: SEC_A_ID,
          status: 'ACTIVE',
          academicYear: { id: YEAR_1ST_ID, yearNumber: 1, label: '1st Year' },
          section: { id: SEC_A_ID, name: 'A' },
        },
      ],
    };

    mockStudentUser = {
      ...mockStudentProfile.user,
      student: mockStudentProfile,
    };

    mockSession = {
      id: SESSION_ID,
      teachingAssignmentId: 'assign-1',
      teacherId: 'teacher-1',
      subjectId: SUBJECT_ID,
      departmentId: DEPT_BCA_ID,
      programId: PROG_BCA_ID,
      academicYearId: YEAR_1ST_ID,
      sectionId: SEC_A_ID,
      sessionDate: new Date(),
      startTime: new Date(Date.now() - 5 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 1000), // Active 25m remaining
      status: 'ACTIVE',
      sessionType: 'REGULAR',
      allowedRadius: 50,
      latitude: 19.0760, // College latitude
      longitude: 72.8777, // College longitude
      faceVerificationRequired: false,
      qrCodeSecretHash: MOCK_TOKEN_HASH,
      qrCodeTtlSeconds: 30,
      allowLateScan: false,
      teachingAssignment: { id: 'assign-1', status: 'ACTIVE' },
      teacher: { user: { id: 'teacher-user-1', firstName: 'Jane', lastName: 'Doe', isActive: true } },
      subject: { id: SUBJECT_ID, name: 'Core Java', code: 'CS-301', credits: 4, isActive: true },
      section: { id: SEC_A_ID, name: 'A' },
      program: { id: PROG_BCA_ID, name: 'BCA', code: 'BCA' },
      academicYear: { id: YEAR_1ST_ID, yearNumber: 1, label: '1st Year' },
      department: { id: DEPT_BCA_ID, name: 'Computer Applications', code: 'CA' },
    };

    userRepository.findByIdWithProfiles.mockResolvedValue(mockStudentUser);
    studentRepository.findStudentByUserId.mockResolvedValue(mockStudentProfile);
    studentRepository.findStudentById.mockResolvedValue(mockStudentProfile);
    studentRepository.findSessionById.mockResolvedValue(mockSession);
    studentRepository.findAttendanceRecord.mockResolvedValue(null);
    studentRepository.findActiveEnrollment.mockResolvedValue(mockStudentProfile.enrollments[0]);

    mockGetCache.mockResolvedValue({
      sessionId: SESSION_ID,
      qrToken: MOCK_SESSION_TOKEN,
      sessionSecretHash: MOCK_TOKEN_HASH,
      status: 'ACTIVE',
      expiryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    });
  });

  // ─────────────────────────────────────────────────────────
  // 1. Profile & Institutional Identity
  // ─────────────────────────────────────────────────────────

  describe('GET /api/v1/student/profile', () => {
    it('should return student profile with unique institutional identity & enrollment info', async () => {
      const res = await request(app)
        .get('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rollNumber).toBe('BCA-2026-001');
      expect(res.body.data.enrollmentNumber).toBe('EN2026001');
      expect(res.body.data.program.code).toBe('BCA');
      expect(res.body.data.section.name).toBe('A');
      expect(res.body.data.activeEnrollments).toHaveLength(1);
    });

    it('should reject unauthorized role (e.g. TEACHER accessing student endpoint)', async () => {
      userRepository.findByIdWithProfiles.mockResolvedValue({
        id: TEACHER_USER_ID,
        role: 'TEACHER',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/student/profile')
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/student/profile', () => {
    it('should allow student to update editable profile fields', async () => {
      studentRepository.updateStudentProfile.mockResolvedValue({
        ...mockStudentProfile,
        user: { ...mockStudentProfile.user, firstName: 'Alex Updated', phoneNumber: '9998887770' },
      });

      const res = await request(app)
        .patch('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({ firstName: 'Alex Updated', phoneNumber: '9998887770' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Alex Updated');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. Change Password & Forgot/Reset Password
  // ─────────────────────────────────────────────────────────

  describe('Password Workflows', () => {
    it('should allow student to change password with valid current password', async () => {
      userRepository.findById.mockResolvedValue({
        id: STUDENT_USER_ID,
        passwordHash: await hashPassword('OldPassword123!'),
      });

      const res = await request(app)
        .post('/api/v1/student/change-password')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(userRepository.updatePasswordWithFlag).toHaveBeenCalled();
    });

    it('should issue password reset token for forgot password request', async () => {
      userRepository.findByEmail.mockResolvedValue(mockStudentUser);

      const res = await request(app)
        .post('/api/v1/student/forgot-password')
        .send({ email: 'student@college.edu' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      expect(passwordResetTokenRepository.create).toHaveBeenCalled();
    });

    it('should reset password with valid reset token', async () => {
      const resetToken = 'valid-reset-token-xyz';
      const tokenHash = hashToken(resetToken);

      passwordResetTokenRepository.findByTokenHash.mockResolvedValue({
        id: 'token-rec-1',
        tokenHash,
        userId: STUDENT_USER_ID,
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        user: mockStudentUser,
      });

      const res = await request(app)
        .post('/api/v1/student/reset-password')
        .send({ token: resetToken, newPassword: 'BrandNewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(passwordResetTokenRepository.markAsUsed).toHaveBeenCalledWith('token-rec-1');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. Core Attendance Marking Workflows (Test Cases 1 - 14)
  // ─────────────────────────────────────────────────────────

  describe('POST /api/v1/student/attendance/mark', () => {
    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (cb) =>
        cb({
          attendanceRecord: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'att-rec-100',
              sessionId: SESSION_ID,
              studentId: STUDENT_PROFILE_ID,
              status: 'PRESENT',
              markedAt: new Date(),
              markedVia: 'QR_SCAN',
              session: mockSession,
            }),
          },
        })
      );
    });

    // Test 1: Valid student marks attendance
    it('1. Valid student in BCA 1st Year Sec A marks attendance successfully', async () => {
      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760, // 0m away
          longitude: 72.8777,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PRESENT');
      expect(res.body.data.sessionId).toBe(SESSION_ID);
    });

    // Test 2: Wrong section rejected
    it('2. Student from Section B attempting Section A session must be rejected with 403', async () => {
      studentRepository.findStudentByUserId.mockResolvedValue({
        ...mockStudentProfile,
        sectionId: SEC_B_ID,
        section: { id: SEC_B_ID, name: 'B' },
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('section');
    });

    // Test 3: Wrong program rejected
    it('3. Student from MCA attempting BCA session must be rejected with 403', async () => {
      studentRepository.findStudentByUserId.mockResolvedValue({
        ...mockStudentProfile,
        programId: PROG_MCA_ID,
        program: { id: PROG_MCA_ID, name: 'MCA', code: 'MCA' },
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('program');
    });

    // Test 4: Wrong year rejected
    it('4. Student from 2nd Year attempting 1st Year session must be rejected with 403', async () => {
      studentRepository.findStudentByUserId.mockResolvedValue({
        ...mockStudentProfile,
        academicYearId: YEAR_2ND_ID,
        academicYear: { id: YEAR_2ND_ID, yearNumber: 2, label: '2nd Year' },
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('academic year');
    });

    // Test 5: Wrong department rejected
    it('5. Student from MCA Department attempting BCA Department session must be rejected with 403', async () => {
      studentRepository.findStudentByUserId.mockResolvedValue({
        ...mockStudentProfile,
        departmentId: DEPT_MCA_ID,
        department: { id: DEPT_MCA_ID, name: 'MCA Dept', code: 'MCAD' },
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('department');
    });

    // Test 6: Expired QR / session rejected
    it('6. Attendance request after session expiry must be rejected with 400', async () => {
      studentRepository.findSessionById.mockResolvedValue({
        ...mockSession,
        endTime: new Date(Date.now() - 10 * 1000), // Expired 10s ago
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });

    // Test 7: Invalid QR rejected
    it('7. Invalid or tampered QR session token must be rejected with 400', async () => {
      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: 'fake-invalid-token-abc',
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired QR');
    });

    // Test 8: Duplicate attendance rejected
    it('8. Duplicate attendance attempt must return clear duplicate 409 response', async () => {
      studentRepository.findAttendanceRecord.mockResolvedValue({
        id: 'att-rec-existing',
        sessionId: SESSION_ID,
        studentId: STUDENT_PROFILE_ID,
        status: 'PRESENT',
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been marked');
    });

    // Test 9: Outside geofence rejected
    it('9. Student 200m away when radius is 50m must be rejected with 400', async () => {
      // Coordinates approx 200 meters away from (19.0760, 72.8777)
      const distantLat = 19.0778;
      const distantLon = 72.8777;

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: distantLat,
          longitude: distantLon,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Geofence validation failed');
    });

    // Test 10: Fake client locationVerified flag cannot bypass server validation
    it('10. Client sending locationVerified=true with out-of-range coords must still be rejected by server', async () => {
      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0900, // Miles away
          longitude: 72.8777,
          locationVerified: true, // Fake client flag
          qrValid: true,
          faceVerified: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Geofence validation failed');
    });

    // Test 11: Face verification required and failed -> reject
    it('11. Session requiring face verification fails when biometrics do not match', async () => {
      studentRepository.findSessionById.mockResolvedValue({
        ...mockSession,
        faceVerificationRequired: true,
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
          faceVerificationData: { fail: true },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Face verification failed');
    });

    // Test 12: Face verification disabled -> do not require it
    it('12. Session with face verification disabled marks attendance without face data', async () => {
      studentRepository.findSessionById.mockResolvedValue({
        ...mockSession,
        faceVerificationRequired: false,
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // Test 13: Concurrent duplicate requests protected by DB uniqueness (P2002)
    it('14. Concurrent requests reaching DB simultaneously are caught by PostgreSQL UNIQUE constraint', async () => {
      prisma.$transaction.mockImplementation(async () => {
        const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        });
        throw err;
      });

      const res = await request(app)
        .post('/api/v1/student/attendance/mark')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          sessionId: SESSION_ID,
          sessionToken: MOCK_SESSION_TOKEN,
          latitude: 19.0760,
          longitude: 72.8777,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been marked');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 4. Attendance Summary, Subjects & History
  // ─────────────────────────────────────────────────────────

  describe('Attendance Reporting Endpoints', () => {
    it('GET /api/v1/student/attendance/summary returns overall attendance breakdown', async () => {
      studentRepository.getStudentAttendanceSummary.mockResolvedValue({
        totalSessions: 20,
        totalMarkedRecords: 18,
        presentCount: 16,
        absentCount: 2,
        lateCount: 2,
        excusedCount: 0,
        effectiveAttended: 18,
        attendancePercentage: 90.0,
        lowAttendanceThreshold: 75.0,
        isLowAttendance: false,
      });

      const res = await request(app)
        .get('/api/v1/student/attendance/summary')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendancePercentage).toBe(90.0);
    });

    it('GET /api/v1/student/attendance/subjects returns subject-wise attendance', async () => {
      studentRepository.getStudentSubjectWiseAttendance.mockResolvedValue([
        {
          subjectId: SUBJECT_ID,
          subjectName: 'Core Java',
          subjectCode: 'CS-301',
          credits: 4,
          totalSessions: 10,
          presentCount: 9,
          absentCount: 1,
          attendancePercentage: 90.0,
          isLowAttendance: false,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/student/attendance/subjects')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].subjectCode).toBe('CS-301');
    });

    it('GET /api/v1/student/attendance/history returns paginated attendance history', async () => {
      studentRepository.getStudentAttendanceHistory.mockResolvedValue({
        records: [
          {
            id: 'rec-1',
            sessionId: SESSION_ID,
            status: 'PRESENT',
            markedAt: new Date(),
            markedVia: 'QR_SCAN',
            session: {
              id: SESSION_ID,
              sessionDate: new Date(),
              startTime: new Date(),
              endTime: new Date(),
              subject: { id: SUBJECT_ID, name: 'Core Java', code: 'CS-301' },
              section: { id: SEC_A_ID, name: 'A' },
              teacher: 'Jane Doe',
            },
          },
        ],
        totalCount: 1,
      });

      const res = await request(app)
        .get('/api/v1/student/attendance/history?page=1&limit=10')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.totalCount).toBe(1);
    });
  });
});
