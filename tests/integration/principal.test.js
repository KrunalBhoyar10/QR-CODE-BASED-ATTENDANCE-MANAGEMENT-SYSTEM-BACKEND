import { jest } from '@jest/globals';

// Unstable mock modules BEFORE dynamic imports
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
    $transaction: jest.fn(async (cb) => cb({
      user: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      department: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    })),
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
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByIdWithProfiles: jest.fn(),
    update: jest.fn(),
    updatePasswordWithFlag: jest.fn(),
    findHods: jest.fn(),
    countHods: jest.fn(),
    findHodById: jest.fn(),
    createHodWithDepartment: jest.fn(),
    updateHod: jest.fn(),
    updateHodStatus: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/department.repository.js', () => ({
  default: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/program.repository.js', () => ({
  default: {
    findAllByDepartment: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/academicYear.repository.js', () => ({
  default: {
    findAllByProgram: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/section.repository.js', () => ({
  default: {
    findAllByAcademicYear: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/attendance.repository.js', () => ({
  default: {
    getOverallSummary: jest.fn(),
    getDepartmentWiseAttendance: jest.fn(),
    getProgramWiseAttendance: jest.fn(),
    getAcademicYearWiseAttendance: jest.fn(),
    getSectionWiseAttendance: jest.fn(),
    getSubjectWiseAttendance: jest.fn(),
    getLowAttendanceStudents: jest.fn(),
    getLowAttendanceSubjects: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/refreshToken.repository.js', () => ({
  default: {
    create: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn().mockResolvedValue(true),
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
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: departmentRepository } = await import('../../src/repositories/department.repository.js');
const { default: programRepository } = await import('../../src/repositories/program.repository.js');
const { default: academicYearRepository } = await import('../../src/repositories/academicYear.repository.js');
const { default: sectionRepository } = await import('../../src/repositories/section.repository.js');
const { default: attendanceRepository } = await import('../../src/repositories/attendance.repository.js');

describe('Principal Module Integration Tests', () => {
  const principalId = 'b82d49c6-2182-4f36-96ad-d023eb712211';
  const teacherId = 'c82d49c6-2182-4f36-96ad-d023eb712222';
  const studentId = 'd82d49c6-2182-4f36-96ad-d023eb712233';
  const deptId = 'e82d49c6-2182-4f36-96ad-d023eb712244';
  const hodId = 'f82d49c6-2182-4f36-96ad-d023eb712255';
  const programId = 'a82d49c6-2182-4f36-96ad-d023eb712266';
  const academicYearId = '982d49c6-2182-4f36-96ad-d023eb712277';

  const principalToken = generateAccessToken({
    id: principalId,
    email: 'principal@college.edu',
    role: 'PRINCIPAL',
  });

  const teacherToken = generateAccessToken({
    id: teacherId,
    email: 'teacher@college.edu',
    role: 'TEACHER',
  });

  const studentToken = generateAccessToken({
    id: studentId,
    email: 'student@college.edu',
    role: 'STUDENT',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for authenticateJwt user lookup
    userRepository.findByIdWithProfiles.mockImplementation(async (id) => {
      if (id === principalId) {
        return {
          id: principalId,
          email: 'principal@college.edu',
          role: 'PRINCIPAL',
          firstName: 'Margaret',
          lastName: 'Hamilton',
          isActive: true,
          teacher: null,
          student: null,
          headedDepartment: null,
        };
      }
      if (id === teacherId) {
        return {
          id: teacherId,
          email: 'teacher@college.edu',
          role: 'TEACHER',
          firstName: 'Grace',
          lastName: 'Hopper',
          isActive: true,
          teacher: { id: 't-1', departmentId: deptId },
          student: null,
          headedDepartment: null,
        };
      }
      if (id === studentId) {
        return {
          id: studentId,
          email: 'student@college.edu',
          role: 'STUDENT',
          firstName: 'Ada',
          lastName: 'Lovelace',
          isActive: true,
          teacher: null,
          student: { id: 's-1', departmentId: deptId },
          headedDepartment: null,
        };
      }
      return null;
    });
  });

  // =========================================================================
  // 1. Authorization tests
  // =========================================================================
  describe('Principal Authorization & Security', () => {
    test('Unauthenticated request should be rejected (401)', async () => {
      const res = await request(app).get('/api/v1/principal/profile');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Non-Principal role (TEACHER) cannot access Principal endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/principal/profile')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Role 'TEACHER' is not authorized");
    });

    test('Non-Principal role (STUDENT) cannot create HOD (403)', async () => {
      const res = await request(app)
        .post('/api/v1/principal/hods')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'hod.cs@college.edu',
          departmentId: deptId,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Profile Management
  // =========================================================================
  describe('Principal Profile', () => {
    test('GET /api/v1/principal/profile - returns principal profile', async () => {
      userRepository.findById.mockResolvedValue({
        id: principalId,
        email: 'principal@college.edu',
        firstName: 'Margaret',
        lastName: 'Hamilton',
        role: 'PRINCIPAL',
        phoneNumber: '+1234567890',
        avatarUrl: null,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/principal/profile')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('PRINCIPAL');
      expect(res.body.data.firstName).toBe('Margaret');
    });

    test('PATCH /api/v1/principal/profile - updates profile details', async () => {
      userRepository.findById.mockResolvedValue({ id: principalId });
      userRepository.update.mockResolvedValue({
        id: principalId,
        email: 'principal@college.edu',
        firstName: 'Margaret Updated',
        lastName: 'Hamilton',
        role: 'PRINCIPAL',
        phoneNumber: '+9876543210',
        avatarUrl: 'https://example.com/avatar.jpg',
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/principal/profile')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          firstName: 'Margaret Updated',
          phoneNumber: '+9876543210',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Margaret Updated');
      expect(userRepository.update).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. HOD Lifecycle Management
  // =========================================================================
  describe('HOD Creation & Management', () => {
    test('POST /api/v1/principal/hods - Principal can create HOD with temporary password and mustChangePassword', async () => {
      departmentRepository.findById.mockResolvedValue({
        id: deptId,
        name: 'Computer Science & Engineering',
        code: 'CSE',
      });
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.createHodWithDepartment.mockResolvedValue({
        id: hodId,
        email: 'hod.cs@college.edu',
        firstName: 'Donald',
        lastName: 'Knuth',
        role: 'HOD',
        phoneNumber: null,
        isActive: true,
        mustChangePassword: true,
        headedDepartment: { id: deptId, name: 'Computer Science & Engineering', code: 'CSE' },
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/principal/hods')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          firstName: 'Donald',
          lastName: 'Knuth',
          email: 'hod.cs@college.edu',
          departmentId: deptId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hod.role).toBe('HOD');
      expect(res.body.data.hod.mustChangePassword).toBe(true);
      expect(res.body.data.hod.headedDepartment.id).toBe(deptId);
      expect(res.body.data.temporaryPassword).toBeDefined();
    });

    test('POST /api/v1/principal/hods - should reject invalid department (404)', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/principal/hods')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          firstName: 'Donald',
          lastName: 'Knuth',
          email: 'hod.cs@college.edu',
          departmentId: deptId,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not exist');
    });

    test('POST /api/v1/principal/hods - should reject duplicate email (409)', async () => {
      departmentRepository.findById.mockResolvedValue({ id: deptId, name: 'CSE' });
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-id', email: 'hod.cs@college.edu' });

      const res = await request(app)
        .post('/api/v1/principal/hods')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          firstName: 'Donald',
          lastName: 'Knuth',
          email: 'hod.cs@college.edu',
          departmentId: deptId,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    test('GET /api/v1/principal/hods - pagination and filtering works', async () => {
      userRepository.findHods.mockResolvedValue([
        {
          id: hodId,
          email: 'hod.cs@college.edu',
          firstName: 'Donald',
          lastName: 'Knuth',
          role: 'HOD',
          isActive: true,
          mustChangePassword: true,
          headedDepartment: { id: deptId, name: 'Computer Science', code: 'CS' },
          createdAt: new Date(),
        },
      ]);
      userRepository.countHods.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/principal/hods?page=1&limit=10&isActive=true')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.totalCount).toBe(1);
      expect(res.body.pagination.page).toBe(1);
    });

    test('GET /api/v1/principal/hods/:id - returns HOD details and verified department', async () => {
      userRepository.findHodById.mockResolvedValue({
        id: hodId,
        email: 'hod.cs@college.edu',
        firstName: 'Donald',
        lastName: 'Knuth',
        role: 'HOD',
        isActive: true,
        headedDepartment: {
          id: deptId,
          name: 'Computer Science',
          code: 'CS',
          _count: { programs: 2, teachers: 5, students: 120, subjects: 8 },
        },
      });

      const res = await request(app)
        .get(`/api/v1/principal/hods/${hodId}`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(hodId);
      expect(res.body.data.headedDepartment.id).toBe(deptId);
    });

    test('PATCH /api/v1/principal/hods/:id/status - deactivating HOD revokes tokens and updates status', async () => {
      userRepository.findHodById.mockResolvedValue({
        id: hodId,
        email: 'hod.cs@college.edu',
        isActive: true,
      });
      userRepository.updateHodStatus.mockResolvedValue({
        id: hodId,
        email: 'hod.cs@college.edu',
        isActive: false,
        headedDepartment: { id: deptId, name: 'CS', code: 'CS' },
      });

      const res = await request(app)
        .patch(`/api/v1/principal/hods/${hodId}/status`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({ isActive: false, reason: 'Department restructuring' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    test('POST /api/v1/principal/hods/:id/reset-password - resets HOD password and sets mustChangePassword', async () => {
      userRepository.findHodById.mockResolvedValue({
        id: hodId,
        email: 'hod.cs@college.edu',
        isActive: true,
      });
      userRepository.updatePasswordWithFlag.mockResolvedValue({ id: hodId });

      const res = await request(app)
        .post(`/api/v1/principal/hods/${hodId}/reset-password`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.temporaryPassword).toBeDefined();
      expect(userRepository.updatePasswordWithFlag).toHaveBeenCalledWith(
        hodId,
        expect.any(String),
        true
      );
    });
  });

  // =========================================================================
  // 4. Academic Hierarchy Navigation
  // =========================================================================
  describe('Academic Hierarchy Navigation', () => {
    test('GET /api/v1/principal/departments - returns department list', async () => {
      departmentRepository.findAll.mockResolvedValue([
        { id: deptId, name: 'Computer Science', code: 'CS', _count: { programs: 2 } },
      ]);

      const res = await request(app)
        .get('/api/v1/principal/departments')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe(deptId);
    });

    test('GET /api/v1/principal/departments/:id/programs - returns programs', async () => {
      departmentRepository.findById.mockResolvedValue({ id: deptId, name: 'CS' });
      programRepository.findAllByDepartment.mockResolvedValue([
        { id: programId, name: 'BCA', code: 'BCA', departmentId: deptId },
      ]);

      const res = await request(app)
        .get(`/api/v1/principal/departments/${deptId}/programs`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe(programId);
    });

    test('GET /api/v1/principal/programs/:id/academic-years - returns academic years', async () => {
      programRepository.findById.mockResolvedValue({ id: programId, name: 'BCA' });
      academicYearRepository.findAllByProgram.mockResolvedValue([
        { id: academicYearId, yearNumber: 1, label: '1st Year', programId },
      ]);

      const res = await request(app)
        .get(`/api/v1/principal/programs/${programId}/academic-years`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].yearNumber).toBe(1);
    });

    test('GET /api/v1/principal/academic-years/:id/sections - returns sections', async () => {
      academicYearRepository.findById.mockResolvedValue({ id: academicYearId, label: '1st Year' });
      sectionRepository.findAllByAcademicYear.mockResolvedValue([
        { id: 'sec-1', name: 'A', capacity: 60, academicYearId },
      ]);

      const res = await request(app)
        .get(`/api/v1/principal/academic-years/${academicYearId}/sections`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('A');
    });
  });

  // =========================================================================
  // 5. Attendance Monitoring & Analytics
  // =========================================================================
  describe('Attendance Monitoring & Aggregations', () => {
    test('GET /api/v1/principal/attendance/summary - returns aggregations', async () => {
      attendanceRepository.getOverallSummary.mockResolvedValue({
        totalStudents: 150,
        totalSessions: 25,
        totalRecords: 3500,
        presentCount: 2975,
        absentCount: 525,
        lateCount: 0,
        excusedCount: 0,
        attendancePercentage: 85.0,
      });

      const res = await request(app)
        .get('/api/v1/principal/attendance/summary')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudents).toBe(150);
      expect(res.body.data.presentCount).toBe(2975);
      expect(res.body.data.absentCount).toBe(525);
      expect(res.body.data.attendancePercentage).toBe(85.0);
    });

    test('GET /api/v1/principal/attendance/departments - returns department-wise aggregations', async () => {
      attendanceRepository.getDepartmentWiseAttendance.mockResolvedValue([
        {
          departmentId: deptId,
          departmentName: 'Computer Science',
          departmentCode: 'CS',
          totalSessions: 10,
          totalRecords: 600,
          presentCount: 540,
          absentCount: 60,
          attendancePercentage: 90.0,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/principal/attendance/departments')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].departmentCode).toBe('CS');
      expect(res.body.data[0].attendancePercentage).toBe(90.0);
    });

    test('GET /api/v1/principal/attendance/low-attendance - low attendance filtering works with threshold', async () => {
      attendanceRepository.getLowAttendanceStudents.mockResolvedValue({
        threshold: 75.0,
        students: [
          {
            studentId: 'st-low-1',
            rollNumber: 'CS-042',
            firstName: 'Bob',
            lastName: 'Dylan',
            attendancePercentage: 55.5,
          },
        ],
        pagination: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
      });

      attendanceRepository.getLowAttendanceSubjects.mockResolvedValue({
        threshold: 75.0,
        subjects: [
          {
            subjectId: 'sub-low-1',
            subjectCode: 'CS-301',
            subjectName: 'Compiler Design',
            attendancePercentage: 62.0,
          },
        ],
        pagination: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/principal/attendance/low-attendance?threshold=75')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.threshold).toBe(75.0);
      expect(res.body.data.students.length).toBe(1);
      expect(res.body.data.students[0].attendancePercentage).toBeLessThan(75);
      expect(res.body.data.subjects.length).toBe(1);
    });
  });
});
