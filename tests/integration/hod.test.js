import { jest } from '@jest/globals';

// ─────────────────────────────────────────────────────────
// Mock Prisma & Redis BEFORE any dynamic imports
// ─────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn().mockResolvedValue(true),
    $transaction: jest.fn(async (cb) =>
      cb({
        user: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
        teacher: { create: jest.fn(), findUnique: jest.fn() },
        department: { update: jest.fn(), updateMany: jest.fn() },
      })
    ),
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
    findHods: jest.fn(),
    countHods: jest.fn(),
    findHodById: jest.fn(),
    createHodWithDepartment: jest.fn(),
    updateHod: jest.fn(),
    updateHodStatus: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/hod.repository.js', () => ({
  default: {
    findDepartmentById: jest.fn(),
    // Programs
    findProgramsByDepartment: jest.fn(),
    findProgramById: jest.fn(),
    findProgramByCode: jest.fn(),
    createProgram: jest.fn(),
    updateProgram: jest.fn(),
    // Academic Years
    findAcademicYearsByProgram: jest.fn(),
    findAcademicYearById: jest.fn(),
    findAcademicYearByProgramAndNumber: jest.fn(),
    createAcademicYear: jest.fn(),
    updateAcademicYear: jest.fn(),
    // Sections
    findSectionsByAcademicYear: jest.fn(),
    findSectionById: jest.fn(),
    findSectionByAcademicYearAndName: jest.fn(),
    createSection: jest.fn(),
    updateSection: jest.fn(),
    // Subjects
    findSubjectsByDepartment: jest.fn(),
    findSubjectById: jest.fn(),
    findSubjectByCode: jest.fn(),
    createSubject: jest.fn(),
    updateSubject: jest.fn(),
    // Teachers
    findTeachersByDepartment: jest.fn(),
    findTeacherById: jest.fn(),
    findTeacherByEmployeeId: jest.fn(),
    createTeacherWithUser: jest.fn(),
    updateTeacherStatus: jest.fn(),
    // Teaching Assignments
    findAssignmentsByDepartment: jest.fn(),
    findAssignmentById: jest.fn(),
    findDuplicateAssignment: jest.fn(),
    createTeachingAssignment: jest.fn(),
    updateAssignmentStatus: jest.fn(),
    // Students
    findStudentsByDepartment: jest.fn(),
    findStudentById: jest.fn(),
    findStudentAttendance: jest.fn(),
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

// ─────────────────────────────────────────────────────────
// Dynamic Imports (after mocks)
// ─────────────────────────────────────────────────────────
const { default: app } = await import('../../src/app.js');
const { default: request } = await import('supertest');
const { generateAccessToken } = await import('../../src/utils/tokens.js');
const { default: userRepository } = await import('../../src/repositories/user.repository.js');
const { default: hodRepository } = await import('../../src/repositories/hod.repository.js');
const { default: attendanceRepository } = await import('../../src/repositories/attendance.repository.js');

// ─────────────────────────────────────────────────────────
// Test Data Constants
// ─────────────────────────────────────────────────────────
const HOD_USER_ID   = 'aaa00000-0000-4000-8000-000000000001';
const TEACHER_USER_ID = 'bbb00000-0000-4000-8000-000000000002';
const STUDENT_ID    = 'ccc00000-0000-4000-8000-000000000003';
const PRINCIPAL_ID  = 'ddd00000-0000-4000-8000-000000000004';
const OTHER_HOD_ID  = 'eee00000-0000-4000-8000-000000000005';

const DEPT_ID       = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';
const OTHER_DEPT_ID = 'f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2';
const PROGRAM_ID    = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const ACAD_YEAR_ID  = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const SECTION_ID    = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const SUBJECT_ID    = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1';
const TEACHER_ID    = 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1';
const ASSIGNMENT_ID = 'f1f1f1f1-f1f1-4f1f-8f1f-aabbccddee11';

// Tokens
const hodToken = generateAccessToken({ id: HOD_USER_ID, email: 'hod@dept.edu', role: 'HOD' });
const principalToken = generateAccessToken({ id: PRINCIPAL_ID, email: 'principal@college.edu', role: 'PRINCIPAL' });
const otherHodToken = generateAccessToken({ id: OTHER_HOD_ID, email: 'hod2@dept.edu', role: 'HOD' });

// Shared mocked department
const mockDepartment = { id: DEPT_ID, name: 'Computer Science', code: 'CS' };
const otherDepartment = { id: OTHER_DEPT_ID, name: 'Mechanical', code: 'MECH' };

// HOD user with headed department
const hodUser = {
  id: HOD_USER_ID,
  email: 'hod@dept.edu',
  role: 'HOD',
  firstName: 'John',
  lastName: 'Doe',
  isActive: true,
  teacher: null,
  student: null,
  headedDepartment: mockDepartment,
};

// HOD user with NO department (unassigned)
const unassignedHodUser = {
  id: OTHER_HOD_ID,
  email: 'hod2@dept.edu',
  role: 'HOD',
  firstName: 'Jane',
  lastName: 'Doe',
  isActive: true,
  teacher: null,
  student: null,
  headedDepartment: null,
};

// ─────────────────────────────────────────────────────────
// Describe Blocks
// ─────────────────────────────────────────────────────────
describe('HOD Module Integration Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: HOD user lookup returns valid HOD with department
    userRepository.findByIdWithProfiles.mockImplementation(async (id) => {
      if (id === HOD_USER_ID) return hodUser;
      if (id === OTHER_HOD_ID) return unassignedHodUser;
      if (id === PRINCIPAL_ID)
        return {
          id: PRINCIPAL_ID,
          email: 'principal@college.edu',
          role: 'PRINCIPAL',
          firstName: 'Principal',
          lastName: 'User',
          isActive: true,
          teacher: null,
          student: null,
          headedDepartment: null,
        };
      return null;
    });
  });

  // =========================================================
  // A. AUTHORIZATION CHECKS
  // =========================================================
  describe('Authorization & Security', () => {

    test('Unauthenticated request returns 401', async () => {
      const res = await request(app).get('/api/v1/hod/profile');
      expect(res.status).toBe(401);
    });

    test('PRINCIPAL cannot access HOD routes (403)', async () => {
      const res = await request(app)
        .get('/api/v1/hod/profile')
        .set('Authorization', `Bearer ${principalToken}`);
      expect(res.status).toBe(403);
    });

    test('HOD without department gets 403 on any scoped resource', async () => {
      const res = await request(app)
        .get('/api/v1/hod/programs')
        .set('Authorization', `Bearer ${otherHodToken}`);
      expect(res.status).toBe(403);
    });

    test('HOD with valid department can access profile', async () => {
      userRepository.findById.mockResolvedValue(hodUser);
      const res = await request(app)
        .get('/api/v1/hod/profile')
        .set('Authorization', `Bearer ${hodToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================
  // B. PROGRAMS
  // =========================================================
  describe('Programs', () => {

    const mockProgram = {
      id: PROGRAM_ID,
      name: 'MCA',
      code: 'MCA',
      durationYears: 2,
      isActive: true,
      departmentId: DEPT_ID,
      department: mockDepartment,
      academicYears: [],
      _count: { students: 0, subjects: 0 },
    };

    test('HOD can list programs in own department', async () => {
      hodRepository.findProgramsByDepartment.mockResolvedValue([mockProgram]);
      const res = await request(app)
        .get('/api/v1/hod/programs')
        .set('Authorization', `Bearer ${hodToken}`);
      expect(res.status).toBe(200);
      expect(hodRepository.findProgramsByDepartment).toHaveBeenCalledWith(DEPT_ID, expect.any(Object));
    });

    test('HOD can create program in own department', async () => {
      hodRepository.findProgramByCode.mockResolvedValue(null); // no duplicate
      hodRepository.createProgram.mockResolvedValue(mockProgram);
      const res = await request(app)
        .post('/api/v1/hod/programs')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'MCA', code: 'MCA', durationYears: 2 });
      expect(res.status).toBe(201);
      // Verify departmentId was set from authenticated context, not request body
      expect(hodRepository.createProgram).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('HOD cannot create a program with a duplicate code in department', async () => {
      hodRepository.findProgramByCode.mockResolvedValue(mockProgram); // duplicate
      const res = await request(app)
        .post('/api/v1/hod/programs')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'MCA Duplicate', code: 'MCA' });
      expect(res.status).toBe(409);
    });

    test('HOD cannot access program from another department (403)', async () => {
      hodRepository.findProgramById.mockResolvedValue({
        ...mockProgram,
        departmentId: OTHER_DEPT_ID, // belongs to different dept
      });
      const res = await request(app)
        .get(`/api/v1/hod/programs/${PROGRAM_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // C. TEACHERS
  // =========================================================
  describe('Teachers', () => {

    const mockTeacherRecord = {
      id: TEACHER_ID,
      employeeId: 'EMP001',
      designation: 'Assistant Professor',
      departmentId: DEPT_ID,
      userId: TEACHER_USER_ID,
      user: {
        id: TEACHER_USER_ID,
        email: 'teacher@dept.edu',
        firstName: 'Grace',
        lastName: 'Hopper',
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
      },
      department: mockDepartment,
      teachingAssignments: [],
      _count: { teachingAssignments: 0 },
    };

    test('HOD can create a teacher in own department', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      hodRepository.findTeacherByEmployeeId.mockResolvedValue(null);
      hodRepository.createTeacherWithUser.mockResolvedValue(mockTeacherRecord);

      const res = await request(app)
        .post('/api/v1/hod/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'teacher@dept.edu',
          employeeId: 'EMP001',
          designation: 'Assistant Professor',
        });

      expect(res.status).toBe(201);
      // Confirm departmentId injected from context, not request
      expect(hodRepository.createTeacherWithUser).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherData: expect.objectContaining({ departmentId: DEPT_ID }),
        })
      );
    });

    test('HOD cannot create teacher with duplicate email (409)', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });
      const res = await request(app)
        .post('/api/v1/hod/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'existing@dept.edu',
          employeeId: 'EMP002',
        });
      expect(res.status).toBe(409);
    });

    test('HOD cannot view teacher from another department (403)', async () => {
      hodRepository.findTeacherById.mockResolvedValue({
        ...mockTeacherRecord,
        departmentId: OTHER_DEPT_ID, // different department
      });
      const res = await request(app)
        .get(`/api/v1/hod/teachers/${TEACHER_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);
      expect(res.status).toBe(403);
    });

    test('HOD can deactivate a teacher in own department', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockTeacherRecord);
      hodRepository.updateTeacherStatus.mockResolvedValue({
        id: TEACHER_USER_ID,
        isActive: false,
        teacher: mockTeacherRecord,
      });

      const res = await request(app)
        .patch(`/api/v1/hod/teachers/${TEACHER_ID}/status`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ isActive: false, reason: 'On leave' });

      expect(res.status).toBe(200);
    });
  });

  // =========================================================
  // D. TEACHING ASSIGNMENTS
  // =========================================================
  describe('Teaching Assignments', () => {

    const mockActiveTeacher = {
      id: TEACHER_ID,
      employeeId: 'EMP001',
      departmentId: DEPT_ID,
      userId: TEACHER_USER_ID,
      user: { id: TEACHER_USER_ID, isActive: true },
      department: mockDepartment,
    };

    const mockActiveSubject = {
      id: SUBJECT_ID,
      name: 'Core Java',
      code: 'CJ-301',
      isActive: true,
      departmentId: DEPT_ID,
      programId: PROGRAM_ID,
    };

    const mockActiveProgram = {
      id: PROGRAM_ID,
      name: 'MCA',
      code: 'MCA',
      isActive: true,
      departmentId: DEPT_ID,
    };

    const mockAcademicYear = {
      id: ACAD_YEAR_ID,
      yearNumber: 1,
      label: '1st Year',
      programId: PROGRAM_ID,
      program: { ...mockActiveProgram, department: mockDepartment },
    };

    const mockSection = {
      id: SECTION_ID,
      name: 'A',
      academicYearId: ACAD_YEAR_ID,
      academicYear: {
        ...mockAcademicYear,
        program: { ...mockActiveProgram, department: mockDepartment },
      },
    };

    const mockAssignment = {
      id: ASSIGNMENT_ID,
      teacherId: TEACHER_ID,
      subjectId: SUBJECT_ID,
      departmentId: DEPT_ID,
      programId: PROGRAM_ID,
      academicYearId: ACAD_YEAR_ID,
      sectionId: SECTION_ID,
      status: 'ACTIVE',
      teacher: mockActiveTeacher,
      subject: mockActiveSubject,
      program: mockActiveProgram,
      academicYear: mockAcademicYear,
      section: mockSection,
      department: mockDepartment,
    };

    const validAssignmentPayload = {
      teacherId: TEACHER_ID,
      subjectId: SUBJECT_ID,
      programId: PROGRAM_ID,
      academicYearId: ACAD_YEAR_ID,
      sectionId: SECTION_ID,
    };

    test('Valid assignment succeeds (201)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue(mockActiveSubject);
      hodRepository.findProgramById.mockResolvedValue(mockActiveProgram);
      hodRepository.findAcademicYearById.mockResolvedValue(mockAcademicYear);
      hodRepository.findSectionById.mockResolvedValue(mockSection);
      hodRepository.findDuplicateAssignment.mockResolvedValue(null); // no duplicate
      hodRepository.createTeachingAssignment.mockResolvedValue(mockAssignment);

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(201);
      expect(hodRepository.createTeachingAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('Duplicate assignment fails (409)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue(mockActiveSubject);
      hodRepository.findProgramById.mockResolvedValue(mockActiveProgram);
      hodRepository.findAcademicYearById.mockResolvedValue(mockAcademicYear);
      hodRepository.findSectionById.mockResolvedValue(mockSection);
      hodRepository.findDuplicateAssignment.mockResolvedValue(mockAssignment); // DUPLICATE

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(409);
    });

    test('Assignment with teacher from another department fails (403)', async () => {
      hodRepository.findTeacherById.mockResolvedValue({
        ...mockActiveTeacher,
        departmentId: OTHER_DEPT_ID, // different department
      });

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(403);
    });

    test('Assignment with subject from another department fails (403)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue({
        ...mockActiveSubject,
        departmentId: OTHER_DEPT_ID, // different department
      });

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(403);
    });

    test('Assignment with inactive teacher fails (400)', async () => {
      hodRepository.findTeacherById.mockResolvedValue({
        ...mockActiveTeacher,
        user: { ...mockActiveTeacher.user, isActive: false }, // INACTIVE
      });

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(400);
    });

    test('Assignment with inactive subject fails (400)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue({ ...mockActiveSubject, isActive: false }); // INACTIVE

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(400);
    });

    test('Academic year not belonging to specified program fails (400)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue(mockActiveSubject);
      hodRepository.findProgramById.mockResolvedValue(mockActiveProgram);
      hodRepository.findAcademicYearById.mockResolvedValue({
        ...mockAcademicYear,
        programId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', // DIFFERENT PROGRAM
      });

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(400);
    });

    test('Section not belonging to specified academic year fails (400)', async () => {
      hodRepository.findTeacherById.mockResolvedValue(mockActiveTeacher);
      hodRepository.findSubjectById.mockResolvedValue(mockActiveSubject);
      hodRepository.findProgramById.mockResolvedValue(mockActiveProgram);
      hodRepository.findAcademicYearById.mockResolvedValue(mockAcademicYear);
      hodRepository.findSectionById.mockResolvedValue({
        ...mockSection,
        academicYearId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', // DIFFERENT YEAR
      });

      const res = await request(app)
        .post('/api/v1/hod/teaching-assignments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send(validAssignmentPayload);

      expect(res.status).toBe(400);
    });

    test('HOD cannot view assignment from another department (403)', async () => {
      hodRepository.findAssignmentById.mockResolvedValue({
        ...mockAssignment,
        departmentId: OTHER_DEPT_ID, // different department
      });

      const res = await request(app)
        .get(`/api/v1/hod/teaching-assignments/${ASSIGNMENT_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // E. STUDENTS
  // =========================================================
  describe('Students (Scoped Visibility)', () => {

    const mockStudent = {
      id: STUDENT_ID,
      rollNumber: 'CS2024001',
      enrollmentNumber: 'EN2024001',
      departmentId: DEPT_ID,
      programId: PROGRAM_ID,
      user: { id: 'some-user-id', email: 'student@dept.edu', firstName: 'Alice', lastName: 'Wonderland' },
      department: mockDepartment,
      program: { id: PROGRAM_ID, name: 'MCA', code: 'MCA' },
      academicYear: { id: ACAD_YEAR_ID, label: '1st Year' },
      section: { id: SECTION_ID, name: 'A' },
    };

    test('Student scope is correct — only own department students returned', async () => {
      hodRepository.findStudentsByDepartment.mockResolvedValue({
        students: [mockStudent],
        totalCount: 1,
      });

      const res = await request(app)
        .get('/api/v1/hod/students')
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(hodRepository.findStudentsByDepartment).toHaveBeenCalledWith(
        DEPT_ID,
        expect.any(Object)
      );
    });

    test('HOD cannot view student from another department (403)', async () => {
      hodRepository.findStudentById.mockResolvedValue({
        ...mockStudent,
        departmentId: OTHER_DEPT_ID, // different department
      });

      const res = await request(app)
        .get(`/api/v1/hod/students/${STUDENT_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // F. ATTENDANCE REPORT SCOPE
  // =========================================================
  describe('Attendance Report Scope', () => {

    test('Attendance summary always scoped to HOD department', async () => {
      attendanceRepository.getOverallSummary.mockResolvedValue({
        totalStudents: 80,
        totalSessions: 120,
        totalRecords: 9600,
        presentCount: 8000,
        attendancePercentage: 83.33,
      });

      const res = await request(app)
        .get('/api/v1/hod/attendance/summary')
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      // departmentId must be injected from server context, not query
      expect(attendanceRepository.getOverallSummary).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('HOD cannot inject a foreign departmentId into attendance query', async () => {
      attendanceRepository.getOverallSummary.mockResolvedValue({ totalStudents: 0 });

      await request(app)
        .get(`/api/v1/hod/attendance/summary?departmentId=${OTHER_DEPT_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);

      // Regardless of query param, server must use HOD's own departmentId
      expect(attendanceRepository.getOverallSummary).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('Low attendance report is scoped to HOD department', async () => {
      attendanceRepository.getLowAttendanceStudents.mockResolvedValue({
        threshold: 75,
        students: [],
        pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 1 },
      });
      attendanceRepository.getLowAttendanceSubjects.mockResolvedValue({
        threshold: 75,
        subjects: [],
        pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/hod/attendance/low-attendance')
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(attendanceRepository.getLowAttendanceStudents).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('Reports summary is scoped to HOD department', async () => {
      attendanceRepository.getOverallSummary.mockResolvedValue({ attendancePercentage: 85 });
      attendanceRepository.getProgramWiseAttendance.mockResolvedValue([]);
      attendanceRepository.getLowAttendanceStudents.mockResolvedValue({ students: [], pagination: {} });

      const res = await request(app)
        .get('/api/v1/hod/reports')
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.department.id).toBe(DEPT_ID);
    });
  });

  // =========================================================
  // G. SUBJECTS
  // =========================================================
  describe('Subjects', () => {

    const mockSubject = {
      id: SUBJECT_ID,
      name: 'Core Java',
      code: 'CJ-301',
      isActive: true,
      departmentId: DEPT_ID,
      programId: PROGRAM_ID,
      department: mockDepartment,
      program: { id: PROGRAM_ID, name: 'MCA', code: 'MCA' },
    };

    test('HOD can create subject in own department', async () => {
      hodRepository.findProgramById.mockResolvedValue({
        id: PROGRAM_ID,
        name: 'MCA',
        departmentId: DEPT_ID,
        isActive: true,
      });
      hodRepository.findSubjectByCode.mockResolvedValue(null);
      hodRepository.createSubject.mockResolvedValue(mockSubject);

      const res = await request(app)
        .post('/api/v1/hod/subjects')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'Core Java', code: 'CJ-301', programId: PROGRAM_ID });

      expect(res.status).toBe(201);
      expect(hodRepository.createSubject).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: DEPT_ID })
      );
    });

    test('HOD cannot create subject in program from another department (403)', async () => {
      hodRepository.findProgramById.mockResolvedValue({
        id: PROGRAM_ID,
        departmentId: OTHER_DEPT_ID, // different department
      });

      const res = await request(app)
        .post('/api/v1/hod/subjects')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'Physics', code: 'PHY-101', programId: PROGRAM_ID });

      expect(res.status).toBe(403);
    });

    test('HOD cannot view subject from another department (403)', async () => {
      hodRepository.findSubjectById.mockResolvedValue({
        ...mockSubject,
        departmentId: OTHER_DEPT_ID,
      });

      const res = await request(app)
        .get(`/api/v1/hod/subjects/${SUBJECT_ID}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // H. PROFILE & PASSWORD
  // =========================================================
  describe('Profile & Password', () => {

    test('GET /profile returns HOD profile with department', async () => {
      userRepository.findById.mockResolvedValue(hodUser);
      const res = await request(app)
        .get('/api/v1/hod/profile')
        .set('Authorization', `Bearer ${hodToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.department.id).toBe(DEPT_ID);
    });

    test('Change password with wrong current password returns 400', async () => {
      userRepository.findById.mockResolvedValue({
        ...hodUser,
        passwordHash: '$2b$10$invalid-hash',
      });

      const res = await request(app)
        .post('/api/v1/hod/change-password')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass123' });

      expect(res.status).toBe(400);
    });

    test('Change password with weak new password returns 422', async () => {
      const res = await request(app)
        .post('/api/v1/hod/change-password')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ currentPassword: 'OldPass1', newPassword: 'weak' });

      expect(res.status).toBe(422);
    });
  });
});
