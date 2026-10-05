import { jest } from '@jest/globals';

// Shared mock instances defined OUTSIDE factory functions so the same
// jest.fn() reference is used by both the test and the service layer.

const prismaMock = {
  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  $disconnect: jest.fn().mockResolvedValue(true),
};
const redisMock = {
  ping: jest.fn().mockResolvedValue('PONG'), status: 'ready',
  on: jest.fn(), quit: jest.fn().mockResolvedValue('OK'),
};
const userRepoMock = {
  findByIdWithProfiles: jest.fn(), findByEmail: jest.fn(), findById: jest.fn(),
  update: jest.fn(), updatePasswordWithFlag: jest.fn(), findHods: jest.fn(),
  countHods: jest.fn(), findHodById: jest.fn(), createHodWithDepartment: jest.fn(),
  updateHod: jest.fn(), updateHodStatus: jest.fn(),
};
const deptRepoMock = {
  findAll: jest.fn(), findById: jest.fn(), findByCode: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
};
const programRepoMock   = { findAllByDepartment: jest.fn(), findById: jest.fn() };
const academicYearRepoMock = { findAllByProgram: jest.fn(), findById: jest.fn() };
const sectionRepoMock   = { findAllByAcademicYear: jest.fn(), findById: jest.fn() };
const subjectRepoMock   = {
  findAll: jest.fn(), findById: jest.fn(), findByCode: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
};
const attendanceRepoMock = {
  getOverallSummary: jest.fn(), getDepartmentWiseAttendance: jest.fn(),
  getProgramWiseAttendance: jest.fn(), getAcademicYearWiseAttendance: jest.fn(),
  getSectionWiseAttendance: jest.fn(), getSubjectWiseAttendance: jest.fn(),
  getLowAttendanceStudents: jest.fn(), getLowAttendanceSubjects: jest.fn(),
};
const refreshTokenRepoMock = {
  create: jest.fn(), revokeToken: jest.fn(),
  revokeAllUserTokens: jest.fn().mockResolvedValue(true),
};
const auditLogRepoMock = { createLog: jest.fn().mockResolvedValue(null) };

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
  checkDatabaseConnection: jest.fn().mockResolvedValue({ isConnected: true }),
}));
jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redis: redisMock,
  checkRedisConnection: jest.fn().mockResolvedValue({ isConnected: true }),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
}));
jest.unstable_mockModule('../../src/repositories/user.repository.js',         () => ({ default: userRepoMock }));
jest.unstable_mockModule('../../src/repositories/department.repository.js',   () => ({ default: deptRepoMock }));
jest.unstable_mockModule('../../src/repositories/program.repository.js',      () => ({ default: programRepoMock }));
jest.unstable_mockModule('../../src/repositories/academicYear.repository.js', () => ({ default: academicYearRepoMock }));
jest.unstable_mockModule('../../src/repositories/section.repository.js',      () => ({ default: sectionRepoMock }));
jest.unstable_mockModule('../../src/repositories/subject.repository.js',      () => ({ default: subjectRepoMock }));
jest.unstable_mockModule('../../src/repositories/attendance.repository.js',   () => ({ default: attendanceRepoMock }));
jest.unstable_mockModule('../../src/repositories/refreshToken.repository.js', () => ({ default: refreshTokenRepoMock }));
jest.unstable_mockModule('../../src/repositories/auditLog.repository.js',     () => ({ default: auditLogRepoMock }));
// hod.repository is needed because app.js loads hod.routes.js as a side effect
jest.unstable_mockModule('../../src/repositories/hod.repository.js', () => ({
  default: {
    findDepartmentById: jest.fn(), findProgramsByDepartment: jest.fn(),
    findProgramById: jest.fn(), findProgramByCode: jest.fn(),
    createProgram: jest.fn(), updateProgram: jest.fn(),
    findAcademicYearsByProgram: jest.fn(), findAcademicYearById: jest.fn(),
    findAcademicYearByProgramAndNumber: jest.fn(), createAcademicYear: jest.fn(),
    updateAcademicYear: jest.fn(), findSectionsByAcademicYear: jest.fn(),
    findSectionById: jest.fn(), findSectionByAcademicYearAndName: jest.fn(),
    createSection: jest.fn(), updateSection: jest.fn(),
    findSubjectsByDepartment: jest.fn(), findSubjectById: jest.fn(),
    findSubjectByCode: jest.fn(), createSubject: jest.fn(), updateSubject: jest.fn(),
    findTeachersByDepartment: jest.fn(), findTeacherById: jest.fn(),
    findTeacherByEmployeeId: jest.fn(), createTeacherWithUser: jest.fn(),
    updateTeacherStatus: jest.fn(), findAssignmentsByDepartment: jest.fn(),
    findAssignmentById: jest.fn(), findDuplicateAssignment: jest.fn(),
    createTeachingAssignment: jest.fn(), updateAssignmentStatus: jest.fn(),
    findStudentsByDepartment: jest.fn(), findStudentById: jest.fn(),
    findStudentAttendance: jest.fn(),
  },
}));

const { default: app }                = await import('../../src/app.js');
const { default: request }            = await import('supertest');
const { generateAccessToken }         = await import('../../src/utils/tokens.js');

describe('Academic Hierarchy Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply stable defaults that clearAllMocks resets
    auditLogRepoMock.createLog.mockResolvedValue(null);
    refreshTokenRepoMock.revokeAllUserTokens.mockResolvedValue(true);
  });

  const principalToken = generateAccessToken({ id: 'principal-uuid-1', email: 'principal@college.edu', role: 'PRINCIPAL' });
  const studentToken   = generateAccessToken({ id: 'student-uuid-1',   email: 'student@college.edu',   role: 'STUDENT'    });

  test('GET /api/v1/academic/departments - should return 401 if unauthenticated', async () => {
    const res = await request(app).get('/api/v1/academic/departments');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/v1/academic/departments - should forbid STUDENT (403)', async () => {
    userRepoMock.findByIdWithProfiles.mockResolvedValue({
      id: 'student-uuid-1', email: 'student@college.edu', role: 'STUDENT', isActive: true,
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
    userRepoMock.findByIdWithProfiles.mockResolvedValue({
      id: 'principal-uuid-1', email: 'principal@college.edu', role: 'PRINCIPAL', isActive: true,
    });
    deptRepoMock.findByCode.mockResolvedValue(null);
    deptRepoMock.create.mockResolvedValue({
      id: 'dept-uuid-1', name: 'Computer Science', code: 'CS', description: 'Department of CS',
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
    userRepoMock.findByIdWithProfiles.mockResolvedValue({
      id: 'principal-uuid-1', email: 'principal@college.edu', role: 'PRINCIPAL', isActive: true,
    });
    deptRepoMock.findAll.mockResolvedValue([
      { id: 'dept-1', name: 'Computer Science',        code: 'CS', _count: { programs: 2 } },
      { id: 'dept-2', name: 'Information Technology',  code: 'IT', _count: { programs: 1 } },
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
