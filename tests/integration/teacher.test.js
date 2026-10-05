import { jest } from '@jest/globals';

// ─────────────────────────────────────────────────────────
// Mock Prisma & Redis BEFORE dynamic imports
// ─────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
    $transaction: jest.fn(async (cb) =>
      cb({
        user: { update: jest.fn() },
        teacher: { update: jest.fn(), findUnique: jest.fn() },
      })
    ),
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

jest.unstable_mockModule('../../src/repositories/teacher.repository.js', () => ({
  default: {
    findTeacherByUserId: jest.fn(),
    findTeacherById: jest.fn(),
    updateTeacherProfile: jest.fn(),
    findAssignmentsByTeacher: jest.fn(),
    findAssignmentById: jest.fn(),
    findProgramsByTeacher: jest.fn(),
    findAcademicYearsByTeacher: jest.fn(),
    findSectionsByTeacher: jest.fn(),
    findSubjectsByTeacher: jest.fn(),
    createAttendanceSession: jest.fn(),
    findSessionById: jest.fn(),
    findActiveSessionsByTeacher: jest.fn(),
    findSessionsByTeacher: jest.fn(),
    updateSessionStatus: jest.fn(),
    findSessionAttendanceRecords: jest.fn(),
    getSessionAttendanceSummary: jest.fn(),
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
const { generateAccessToken } = await import('../../src/utils/tokens.js');
const { hashPassword } = await import('../../src/utils/passwords.js');
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: teacherRepository } = await import('../../src/repositories/teacher.repository.js');

// ─────────────────────────────────────────────────────────
// Test Data Constants (Valid RFC4122 v4 UUIDs)
// ─────────────────────────────────────────────────────────
const TEACHER_A_USER_ID = '11111111-1111-4111-8111-111111111111';
const TEACHER_B_USER_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_USER_ID   = '33333333-3333-4333-8333-333333333333';

const TEACHER_A_ID      = 'aaaa1111-1111-4111-8111-111111111111';
const TEACHER_B_ID      = 'bbbb2222-2222-4222-8222-222222222222';

const DEPT_ID           = 'dddd0000-0000-4000-8000-000000000001';
const PROGRAM_BCA_ID    = 'bbbb0000-0000-4000-8000-000000000001';
const PROGRAM_MCA_ID    = 'aaaa0000-0000-4000-8000-000000000002';

const YEAR_1_BCA_ID     = '11110000-0000-4000-8000-000000000001';
const YEAR_1_MCA_ID     = '11110000-0000-4000-8000-000000000002';
const YEAR_2_MCA_ID     = '22220000-0000-4000-8000-000000000003';

const SECTION_A_ID      = 'cccc1111-0000-4000-8000-000000000001';
const SECTION_B_ID      = 'cccc2222-0000-4000-8000-000000000002';

const SUBJECT_JAVA_ID   = 'faaa1111-0000-4000-8000-000000000001';
const SUBJECT_DCN_ID    = 'faaa2222-0000-4000-8000-000000000002';
const SUBJECT_PYTHON_ID = 'faaa3333-0000-4000-8000-000000000003';

const ASSIGNMENT_A1_ID  = 'aa110000-0000-4000-8000-000000000001'; // Teacher A: BCA -> 1st Year -> Sec A -> Java
const ASSIGNMENT_A2_ID  = 'aa220000-0000-4000-8000-000000000002'; // Teacher A: MCA -> 1st Year -> Sec B -> DCN
const ASSIGNMENT_A3_ID  = 'aa330000-0000-4000-8000-000000000003'; // Teacher A: MCA -> 2nd Year -> Sec A -> Java
const ASSIGNMENT_B1_ID  = 'bb110000-0000-4000-8000-000000000004'; // Teacher B: BCA -> 1st Year -> Sec A -> Python

const SESSION_ID        = 'ee110000-0000-4000-8000-000000000001';
const SESSION_B_ID      = 'ee220000-0000-4000-8000-000000000002';

// Auth Tokens
const teacherAToken = generateAccessToken({
  id: TEACHER_A_USER_ID,
  email: 'teacher.a@college.edu',
  role: 'TEACHER',
  teacherId: TEACHER_A_ID,
  departmentId: DEPT_ID,
});

const teacherBToken = generateAccessToken({
  id: TEACHER_B_USER_ID,
  email: 'teacher.b@college.edu',
  role: 'TEACHER',
  teacherId: TEACHER_B_ID,
  departmentId: DEPT_ID,
});

const studentToken = generateAccessToken({
  id: STUDENT_USER_ID,
  email: 'student@college.edu',
  role: 'STUDENT',
});

// Mock Models
const mockTeacherA = {
  id: TEACHER_A_ID,
  employeeId: 'EMP-T-001',
  designation: 'Assistant Professor',
  userId: TEACHER_A_USER_ID,
  departmentId: DEPT_ID,
  user: {
    id: TEACHER_A_USER_ID,
    email: 'teacher.a@college.edu',
    firstName: 'Alan',
    lastName: 'Turing',
    phoneNumber: '+1234567890',
    avatarUrl: 'https://example.com/avatar.jpg',
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  department: {
    id: DEPT_ID,
    name: 'Computer Science & Applications',
    code: 'CSA',
  },
};

const mockTeacherB = {
  id: TEACHER_B_ID,
  employeeId: 'EMP-T-002',
  designation: 'Lecturer',
  userId: TEACHER_B_USER_ID,
  departmentId: DEPT_ID,
  user: {
    id: TEACHER_B_USER_ID,
    email: 'teacher.b@college.edu',
    firstName: 'Grace',
    lastName: 'Hopper',
    phoneNumber: '+1987654321',
    isActive: true,
  },
  department: {
    id: DEPT_ID,
    name: 'Computer Science & Applications',
    code: 'CSA',
  },
};

// Teacher A assignments (BCA -> 1st Year -> Sec A -> Java, MCA -> 1st Year -> Sec B -> DCN, MCA -> 2nd Year -> Sec A -> Java)
const mockAssignmentsTeacherA = [
  {
    id: ASSIGNMENT_A1_ID,
    teacherId: TEACHER_A_ID,
    subjectId: SUBJECT_JAVA_ID,
    departmentId: DEPT_ID,
    programId: PROGRAM_BCA_ID,
    academicYearId: YEAR_1_BCA_ID,
    sectionId: SECTION_A_ID,
    status: 'ACTIVE',
    program: { id: PROGRAM_BCA_ID, name: 'Bachelor of Computer Applications', code: 'BCA', durationYears: 3, isActive: true },
    academicYear: { id: YEAR_1_BCA_ID, yearNumber: 1, label: '1st Year' },
    section: { id: SECTION_A_ID, name: 'Section A', capacity: 60 },
    subject: { id: SUBJECT_JAVA_ID, name: 'Core Java Programming', code: 'BCA-101', credits: 4, isActive: true },
    department: { id: DEPT_ID, name: 'CSA', code: 'CSA' },
  },
  {
    id: ASSIGNMENT_A2_ID,
    teacherId: TEACHER_A_ID,
    subjectId: SUBJECT_DCN_ID,
    departmentId: DEPT_ID,
    programId: PROGRAM_MCA_ID,
    academicYearId: YEAR_1_MCA_ID,
    sectionId: SECTION_B_ID,
    status: 'ACTIVE',
    program: { id: PROGRAM_MCA_ID, name: 'Master of Computer Applications', code: 'MCA', durationYears: 2, isActive: true },
    academicYear: { id: YEAR_1_MCA_ID, yearNumber: 1, label: '1st Year' },
    section: { id: SECTION_B_ID, name: 'Section B', capacity: 50 },
    subject: { id: SUBJECT_DCN_ID, name: 'Data Communication & Networking', code: 'MCA-102', credits: 4, isActive: true },
    department: { id: DEPT_ID, name: 'CSA', code: 'CSA' },
  },
  {
    id: ASSIGNMENT_A3_ID,
    teacherId: TEACHER_A_ID,
    subjectId: SUBJECT_JAVA_ID,
    departmentId: DEPT_ID,
    programId: PROGRAM_MCA_ID,
    academicYearId: YEAR_2_MCA_ID,
    sectionId: SECTION_A_ID,
    status: 'ACTIVE',
    program: { id: PROGRAM_MCA_ID, name: 'Master of Computer Applications', code: 'MCA', durationYears: 2, isActive: true },
    academicYear: { id: YEAR_2_MCA_ID, yearNumber: 2, label: '2nd Year' },
    section: { id: SECTION_A_ID, name: 'Section A', capacity: 50 },
    subject: { id: SUBJECT_JAVA_ID, name: 'Advanced Java', code: 'MCA-201', credits: 4, isActive: true },
    department: { id: DEPT_ID, name: 'CSA', code: 'CSA' },
  },
];

// ─────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────
describe('Teacher Backend Module Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCache.mockResolvedValue(true);
    mockGetCache.mockResolvedValue(null);
    mockDeleteCache.mockResolvedValue(true);

    // Default user repository mock
    userRepository.findByIdWithProfiles.mockImplementation(async (id) => {
      if (id === TEACHER_A_USER_ID) {
        return {
          id: TEACHER_A_USER_ID,
          email: 'teacher.a@college.edu',
          role: 'TEACHER',
          firstName: 'Alan',
          lastName: 'Turing',
          isActive: true,
          teacher: mockTeacherA,
        };
      }
      if (id === TEACHER_B_USER_ID) {
        return {
          id: TEACHER_B_USER_ID,
          email: 'teacher.b@college.edu',
          role: 'TEACHER',
          firstName: 'Grace',
          lastName: 'Hopper',
          isActive: true,
          teacher: mockTeacherB,
        };
      }
      if (id === STUDENT_USER_ID) {
        return {
          id: STUDENT_USER_ID,
          email: 'student@college.edu',
          role: 'STUDENT',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          student: { id: 'stud-1', departmentId: DEPT_ID },
        };
      }
      return null;
    });

    teacherRepository.findTeacherByUserId.mockImplementation(async (userId) => {
      if (userId === TEACHER_A_USER_ID) return mockTeacherA;
      if (userId === TEACHER_B_USER_ID) return mockTeacherB;
      return null;
    });
  });

  // ============================================================
  // 1. Authentication & Role Authorization
  // ============================================================
  describe('Authentication & Role Access Control', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/teacher/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-teacher roles (e.g. STUDENT) with 403', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/profile')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // 2. Teacher Profile & Password Management
  // ============================================================
  describe('Teacher Profile & Password', () => {
    it('GET /api/v1/teacher/profile should return teacher details', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/profile')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('teacher.a@college.edu');
      expect(res.body.data.employeeId).toBe('EMP-T-001');
      expect(res.body.data.designation).toBe('Assistant Professor');
      expect(res.body.data.department.code).toBe('CSA');
    });

    it('PATCH /api/v1/teacher/profile should update profile fields', async () => {
      teacherRepository.updateTeacherProfile.mockResolvedValue({
        ...mockTeacherA,
        designation: 'Associate Professor',
        user: { ...mockTeacherA.user, firstName: 'Alan Mathison' },
      });

      const res = await request(app)
        .patch('/api/v1/teacher/profile')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          firstName: 'Alan Mathison',
          designation: 'Associate Professor',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Alan Mathison');
      expect(res.body.data.designation).toBe('Associate Professor');
    });

    it('POST /api/v1/teacher/change-password should change password when current password is valid', async () => {
      const hashedOldPassword = await hashPassword('OldPassword123');
      userRepository.findById.mockResolvedValue({
        id: TEACHER_A_USER_ID,
        passwordHash: hashedOldPassword,
      });
      userRepository.updatePasswordWithFlag.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/v1/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword@2026',
          confirmPassword: 'NewPassword@2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password changed successfully');
    });

    it('POST /api/v1/teacher/change-password should reject incorrect current password with 400', async () => {
      const hashedOldPassword = await hashPassword('CorrectPassword123');
      userRepository.findById.mockResolvedValue({
        id: TEACHER_A_USER_ID,
        passwordHash: hashedOldPassword,
      });

      const res = await request(app)
        .post('/api/v1/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword@2026',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Current password is incorrect');
    });
  });

  // ============================================================
  // 3. Teaching Assignments & Hierarchical Access
  // ============================================================
  describe('Teaching Assignments Access Boundary', () => {
    it('GET /api/v1/teacher/assignments should return only own assignments grouped hierarchically', async () => {
      teacherRepository.findAssignmentsByTeacher.mockResolvedValue(mockAssignmentsTeacherA);

      const res = await request(app)
        .get('/api/v1/teacher/assignments')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { grouped, assignments, totalCount } = res.body.data;
      expect(totalCount).toBe(3);
      expect(assignments.length).toBe(3);

      // Verify hierarchical grouping structure:
      // BCA -> 1st Year -> Section A -> Java
      // MCA -> 1st Year -> Section B -> DCN
      // MCA -> 2nd Year -> Section A -> Java
      expect(grouped.length).toBe(2); // BCA and MCA

      const bcaGroup = grouped.find((p) => p.programCode === 'BCA');
      expect(bcaGroup).toBeDefined();
      expect(bcaGroup.academicYears.length).toBe(1);
      expect(bcaGroup.academicYears[0].label).toBe('1st Year');
      expect(bcaGroup.academicYears[0].sections[0].sectionName).toBe('Section A');
      expect(bcaGroup.academicYears[0].sections[0].subjects[0].subjectName).toBe('Core Java Programming');

      const mcaGroup = grouped.find((p) => p.programCode === 'MCA');
      expect(mcaGroup).toBeDefined();
      expect(mcaGroup.academicYears.length).toBe(2); // 1st Year and 2nd Year
    });

    it('Teacher A cannot see Teacher B assignments or access an assignment ID belonging to Teacher B', async () => {
      // Mock assignment B belonging to Teacher B
      teacherRepository.findAssignmentById.mockResolvedValue({
        id: ASSIGNMENT_B1_ID,
        teacherId: TEACHER_B_ID,
        subjectId: SUBJECT_PYTHON_ID,
      });

      const res = await request(app)
        .get(`/api/v1/teacher/assignments/${ASSIGNMENT_B1_ID}`)
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('Sub-resource routes: GET /api/v1/teacher/programs, /academic-years, /sections, /subjects', async () => {
      teacherRepository.findProgramsByTeacher.mockResolvedValue([
        { id: PROGRAM_BCA_ID, name: 'BCA', code: 'BCA' },
      ]);
      teacherRepository.findAcademicYearsByTeacher.mockResolvedValue([
        { id: YEAR_1_BCA_ID, yearNumber: 1, label: '1st Year' },
      ]);
      teacherRepository.findSectionsByTeacher.mockResolvedValue([
        { id: SECTION_A_ID, name: 'Section A' },
      ]);
      teacherRepository.findSubjectsByTeacher.mockResolvedValue([
        { id: SUBJECT_JAVA_ID, name: 'Java', code: 'CS-101' },
      ]);

      const [pRes, yRes, sRes, subRes] = await Promise.all([
        request(app).get('/api/v1/teacher/programs').set('Authorization', `Bearer ${teacherAToken}`),
        request(app).get('/api/v1/teacher/academic-years').set('Authorization', `Bearer ${teacherAToken}`),
        request(app).get('/api/v1/teacher/sections').set('Authorization', `Bearer ${teacherAToken}`),
        request(app).get('/api/v1/teacher/subjects').set('Authorization', `Bearer ${teacherAToken}`),
      ]);

      expect(pRes.status).toBe(200);
      expect(yRes.status).toBe(200);
      expect(sRes.status).toBe(200);
      expect(subRes.status).toBe(200);
    });
  });

  // ============================================================
  // 4. Attendance Session Creation & Authorization Security
  // ============================================================
  describe('Attendance Session Creation & Validation', () => {
    it('Teacher A can create session for own valid assignment (PostgreSQL + Redis + QR)', async () => {
      const validAssignment = {
        ...mockAssignmentsTeacherA[0],
        teacher: mockTeacherA,
      };
      teacherRepository.findAssignmentById.mockResolvedValue(validAssignment);

      const mockCreatedSession = {
        id: SESSION_ID,
        teachingAssignmentId: ASSIGNMENT_A1_ID,
        teacherId: TEACHER_A_ID,
        subjectId: SUBJECT_JAVA_ID,
        departmentId: DEPT_ID,
        programId: PROGRAM_BCA_ID,
        academicYearId: YEAR_1_BCA_ID,
        sectionId: SECTION_A_ID,
        sessionDate: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 120000),
        status: 'ACTIVE',
        sessionType: 'REGULAR',
        allowedRadius: 50,
        latitude: 21.1458,
        longitude: 79.0882,
        faceVerificationRequired: false,
        subject: { id: SUBJECT_JAVA_ID, name: 'Core Java Programming', code: 'BCA-101' },
        section: { id: SECTION_A_ID, name: 'Section A' },
        program: { id: PROGRAM_BCA_ID, name: 'BCA', code: 'BCA' },
        academicYear: { id: YEAR_1_BCA_ID, label: '1st Year' },
        department: { id: DEPT_ID, name: 'CSA' },
        createdAt: new Date(),
      };
      teacherRepository.createAttendanceSession.mockResolvedValue(mockCreatedSession);

      const res = await request(app)
        .post('/api/v1/teacher/sessions')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          teachingAssignmentId: ASSIGNMENT_A1_ID,
          duration: 120,
          allowedRadius: 50,
          latitude: 21.1458,
          longitude: 79.0882,
          faceVerificationRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.id).toBe(SESSION_ID);
      expect(res.body.data.session.status).toBe('ACTIVE');

      // Check server derived academic context from assignment
      expect(res.body.data.session.teacherId).toBe(TEACHER_A_ID);
      expect(res.body.data.session.subjectId).toBe(SUBJECT_JAVA_ID);
      expect(res.body.data.session.sectionId).toBe(SECTION_A_ID);
      expect(res.body.data.session.programId).toBe(PROGRAM_BCA_ID);

      // Verify Redis was called with TTL = duration (120 seconds)
      expect(mockSetCache).toHaveBeenCalledTimes(1);
      expect(mockSetCache).toHaveBeenCalledWith(
        `attendance:session:${SESSION_ID}`,
        expect.objectContaining({
          sessionId: SESSION_ID,
          teacherId: TEACHER_A_ID,
          subjectId: SUBJECT_JAVA_ID,
          status: 'ACTIVE',
        }),
        120
      );

      // Verify QR representation does NOT contain passwords, JWT secret, DB info
      const qrData = res.body.data.qr;
      expect(qrData).toBeDefined();
      expect(qrData.payload.sessionId).toBe(SESSION_ID);
      expect(qrData.payload.token).toBeDefined();
      expect(qrData.payload.password).toBeUndefined();
      expect(qrData.payload.jwtSecret).toBeUndefined();
      expect(qrData.payload.database).toBeUndefined();
      expect(qrData.payload.students).toBeUndefined();
    });

    it('Teacher A CANNOT create session with Teacher B assignment ID (Returns 403 Forbidden)', async () => {
      // Mock assignment belonging to Teacher B
      teacherRepository.findAssignmentById.mockResolvedValue({
        id: ASSIGNMENT_B1_ID,
        teacherId: TEACHER_B_ID,
        subjectId: SUBJECT_PYTHON_ID,
        status: 'ACTIVE',
        teacher: mockTeacherB,
        subject: { id: SUBJECT_PYTHON_ID, isActive: true },
        program: { id: PROGRAM_BCA_ID, isActive: true },
      });

      const res = await request(app)
        .post('/api/v1/teacher/sessions')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          teachingAssignmentId: ASSIGNMENT_B1_ID,
          duration: 120,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
      expect(teacherRepository.createAttendanceSession).not.toHaveBeenCalled();
    });

    it('Teacher CANNOT create session for inactive assignment (Returns 400 Bad Request)', async () => {
      teacherRepository.findAssignmentById.mockResolvedValue({
        ...mockAssignmentsTeacherA[0],
        status: 'INACTIVE',
        teacher: mockTeacherA,
      });

      const res = await request(app)
        .post('/api/v1/teacher/sessions')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          teachingAssignmentId: ASSIGNMENT_A1_ID,
          duration: 120,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('assignment is inactive');
    });

    it('Teacher CANNOT create session for inactive subject (Returns 400 Bad Request)', async () => {
      teacherRepository.findAssignmentById.mockResolvedValue({
        ...mockAssignmentsTeacherA[0],
        status: 'ACTIVE',
        teacher: mockTeacherA,
        subject: { id: SUBJECT_JAVA_ID, isActive: false },
      });

      const res = await request(app)
        .post('/api/v1/teacher/sessions')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          teachingAssignmentId: ASSIGNMENT_A1_ID,
          duration: 120,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Subject is inactive');
    });
  });

  // ============================================================
  // 5. Active & Past Sessions Lifecycle
  // ============================================================
  describe('Session Lifecycle & Expiry', () => {
    it('GET /api/v1/teacher/sessions/active returns currently active sessions', async () => {
      const activeSession = {
        id: SESSION_ID,
        teachingAssignmentId: ASSIGNMENT_A1_ID,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60000), // 60s remaining
        status: 'ACTIVE',
        subject: { id: SUBJECT_JAVA_ID, name: 'Java', code: 'BCA-101' },
        section: { id: SECTION_A_ID, name: 'Section A' },
        program: { id: PROGRAM_BCA_ID, name: 'BCA', code: 'BCA' },
        academicYear: { id: YEAR_1_BCA_ID, label: '1st Year' },
        _count: { attendanceRecords: 15 },
      };

      teacherRepository.findActiveSessionsByTeacher.mockResolvedValue([activeSession]);
      mockGetCache.mockResolvedValue({ sessionId: SESSION_ID, status: 'ACTIVE' });

      const res = await request(app)
        .get('/api/v1/teacher/sessions/active')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(SESSION_ID);
      expect(res.body.data[0].hasActiveCache).toBe(true);
      expect(res.body.data[0].remainingSeconds).toBeGreaterThan(0);
    });

    it('GET /api/v1/teacher/sessions/active auto-completes expired sessions', async () => {
      const expiredSessionId = 'ee330000-0000-4000-8000-000000000003';
      const expiredSession = {
        id: expiredSessionId,
        teachingAssignmentId: ASSIGNMENT_A1_ID,
        startTime: new Date(Date.now() - 300000),
        endTime: new Date(Date.now() - 60000), // Expired 1 min ago
        status: 'ACTIVE',
      };

      teacherRepository.findActiveSessionsByTeacher.mockResolvedValue([expiredSession]);
      teacherRepository.updateSessionStatus.mockResolvedValue({ id: expiredSessionId, status: 'COMPLETED' });

      const res = await request(app)
        .get('/api/v1/teacher/sessions/active')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(teacherRepository.updateSessionStatus).toHaveBeenCalledWith(expiredSessionId, 'COMPLETED');
      expect(mockDeleteCache).toHaveBeenCalledWith(`attendance:session:${expiredSessionId}`);
    });

    it('GET /api/v1/teacher/sessions returns paginated list of sessions', async () => {
      teacherRepository.findSessionsByTeacher.mockResolvedValue({
        sessions: [
          {
            id: SESSION_ID,
            sessionDate: new Date(),
            startTime: new Date(),
            endTime: new Date(),
            status: 'COMPLETED',
            subject: { name: 'Java' },
            section: { name: 'A' },
            _count: { attendanceRecords: 45 },
          },
        ],
        totalCount: 1,
      });

      const res = await request(app)
        .get('/api/v1/teacher/sessions?page=1&limit=10')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.totalCount).toBe(1);
    });

    it('POST /api/v1/teacher/sessions/:id/close manually closes active session and deletes Redis key', async () => {
      teacherRepository.findSessionById.mockResolvedValue({
        id: SESSION_ID,
        teacherId: TEACHER_A_ID,
        status: 'ACTIVE',
        subjectId: SUBJECT_JAVA_ID,
        sectionId: SECTION_A_ID,
      });
      teacherRepository.updateSessionStatus.mockResolvedValue({
        id: SESSION_ID,
        status: 'COMPLETED',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/sessions/${SESSION_ID}/close`)
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('closed successfully');
      expect(teacherRepository.updateSessionStatus).toHaveBeenCalledWith(
        SESSION_ID,
        'COMPLETED',
        expect.any(Object)
      );
      expect(mockDeleteCache).toHaveBeenCalledWith(`attendance:session:${SESSION_ID}`);
    });
  });

  // ============================================================
  // 6. View Attendance for Own Session (Verified Metrics)
  // ============================================================
  describe('View Attendance Records for Sessions', () => {
    it('GET /api/v1/teacher/sessions/:id/attendance returns attendance records and DB-derived summary', async () => {
      teacherRepository.findSessionById.mockResolvedValue({
        id: SESSION_ID,
        teacherId: TEACHER_A_ID,
        sectionId: SECTION_A_ID,
        subject: { name: 'Java', code: 'CS-101' },
        section: { name: 'Section A' },
        program: { name: 'BCA' },
        academicYear: { label: '1st Year' },
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
      });

      teacherRepository.findSessionAttendanceRecords.mockResolvedValue({
        records: [
          {
            id: 'rec-1',
            studentId: 'stud-1',
            status: 'PRESENT',
            markedAt: new Date(),
            markedVia: 'QR_SCAN',
            student: {
              rollNumber: 'BCA-001',
              enrollmentNumber: 'EN-2026-001',
              user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@college.edu' },
            },
          },
        ],
        totalCount: 1,
      });

      teacherRepository.getSessionAttendanceSummary.mockResolvedValue({
        totalStudents: 50,
        totalMarked: 45,
        presentCount: 42,
        absentCount: 5,
        lateCount: 3,
        excusedCount: 0,
        attendancePercentage: 84.0,
      });

      const res = await request(app)
        .get(`/api/v1/teacher/sessions/${SESSION_ID}/attendance`)
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].studentName).toBe('Alice Smith');
      expect(res.body.data[0].rollNumber).toBe('BCA-001');

      // Verify stats are derived and not client-provided
      expect(res.body.pagination.summary.totalStudents).toBe(50);
      expect(res.body.pagination.summary.presentCount).toBe(42);
      expect(res.body.pagination.summary.attendancePercentage).toBe(84.0);
    });

    it('Teacher cannot view attendance of another teacher session (Returns 403)', async () => {
      teacherRepository.findSessionById.mockResolvedValue({
        id: SESSION_B_ID,
        teacherId: TEACHER_B_ID,
      });

      const res = await request(app)
        .get(`/api/v1/teacher/sessions/${SESSION_B_ID}/attendance`)
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });
});
