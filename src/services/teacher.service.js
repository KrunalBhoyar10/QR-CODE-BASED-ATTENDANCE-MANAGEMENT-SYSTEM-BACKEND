
const parseDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  let start = null;
  let end = null;
  if (startDate) {
    const sStr = String(startDate).split('T')[0];
    start = new Date(`${sStr}T00:00:00.000Z`);
  }
  if (endDate) {
    const eStr = String(endDate).split('T')[0];
    end = new Date(`${eStr}T23:59:59.999Z`);
  } else if (startDate) {
    const sStr = String(startDate).split('T')[0];
    end = new Date(`${sStr}T23:59:59.999Z`);
  }
  const cond = {};
  if (start && !isNaN(start.getTime())) cond.gte = start;
  if (end && !isNaN(end.getTime())) cond.lte = end;
  return Object.keys(cond).length > 0 ? cond : null;
};

import { prisma } from '../lib/prisma.js';
import teacherRepository from '../repositories/teacher.repository.js';
import studentRepository from '../repositories/student.repository.js';
import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import auditService from './audit.service.js';
import { getCache, setCache, deleteCache } from '../lib/redis.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../utils/errors.js';

// ============================================================
// Helper: Resolve & Validate Teacher Context
// ============================================================

const resolveTeacher = async (userId) => {
  const teacher = await teacherRepository.findTeacherByUserId(userId);
  if (!teacher) {
    throw new ForbiddenError('Authenticated user does not have a linked teacher profile');
  }
  if (!teacher.user?.isActive) {
    throw new ForbiddenError('Teacher user account is inactive');
  }
  return teacher;
};

// ============================================================
// Teacher Service Class
// ============================================================

class TeacherService {
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Profile & Password
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getProfile(userId) {
    const cacheKey = `teacher:profile:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const teacher = await resolveTeacher(userId);

    const profile = {
      id: teacher.id,
      userId: teacher.userId,
      employeeId: teacher.employeeId,
      designation: teacher.designation,
      email: teacher.user.email,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      phoneNumber: teacher.user.phoneNumber,
      avatarUrl: teacher.user.avatarUrl,
      isActive: teacher.user.isActive,
      mustChangePassword: teacher.user.mustChangePassword,
      lastLoginAt: teacher.user.lastLoginAt,
      department: teacher.department
        ? {
            id: teacher.department.id,
            name: teacher.department.name,
            code: teacher.department.code,
          }
        : null,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    await setCache(cacheKey, profile, 30);
    return profile;
  }

  async updateProfile(userId, profileData, req) {
    await resolveTeacher(userId);

    const updated = await teacherRepository.updateTeacherProfile(userId, {
      firstName: profileData.firstName?.trim(),
      lastName: profileData.lastName?.trim(),
      phoneNumber: profileData.phoneNumber,
      avatarUrl: profileData.avatarUrl,
      designation: profileData.designation?.trim(),
    });

    await auditService.log({
      userId,
      action: 'TEACHER_PROFILE_UPDATED',
      entity: 'Teacher',
      entityId: updated.id,
      details: { updatedFields: Object.keys(profileData) },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    await deleteCache(`teacher:profile:${userId}`);

    return {
      id: updated.id,
      userId: updated.userId,
      employeeId: updated.employeeId,
      designation: updated.designation,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      phoneNumber: updated.user.phoneNumber,
      avatarUrl: updated.user.avatarUrl,
      isActive: updated.user.isActive,
      department: updated.department,
      updatedAt: updated.updatedAt,
    };
  }

  async changePassword({ userId, currentPassword, newPassword, req }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newHash = await hashPassword(newPassword);
    await userRepository.updatePasswordWithFlag(userId, newHash, false);

    // Invalidate all active refresh tokens for security
    await refreshTokenRepository.revokeAllForUser(userId);

    await auditService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      details: { role: 'TEACHER' },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return { message: 'Password changed successfully' };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. Teaching Assignments (Grouped & Structured)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAssignments(userId, filters = {}) {
    const isDefault = !filters || Object.keys(filters).length === 0;
    const cacheKey = `teacher:assignments:${userId}`;
    if (isDefault) {
      const cached = await getCache(cacheKey);
      if (cached) return cached;
    }

    const teacher = await resolveTeacher(userId);
    const assignments = await teacherRepository.findAssignmentsByTeacher(teacher.id, filters);

    // Build the hierarchical tree: Program -> Academic Year -> Section -> Subject
    const groupedMap = new Map();

    for (const a of assignments) {
      const prog = a.program;
      const year = a.academicYear;
      const sec = a.section;
      const sub = a.subject;

      if (!prog || !year || !sec || !sub) continue;

      if (!groupedMap.has(prog.id)) {
        groupedMap.set(prog.id, {
          programId: prog.id,
          programName: prog.name,
          programCode: prog.code,
          durationYears: prog.durationYears,
          isActive: prog.isActive,
          academicYearsMap: new Map(),
        });
      }

      const progNode = groupedMap.get(prog.id);
      if (!progNode.academicYearsMap.has(year.id)) {
        progNode.academicYearsMap.set(year.id, {
          academicYearId: year.id,
          yearNumber: year.yearNumber,
          label: year.label,
          sectionsMap: new Map(),
        });
      }

      const yearNode = progNode.academicYearsMap.get(year.id);
      if (!yearNode.sectionsMap.has(sec.id)) {
        yearNode.sectionsMap.set(sec.id, {
          sectionId: sec.id,
          sectionName: sec.name,
          capacity: sec.capacity,
          subjects: [],
        });
      }

      const secNode = yearNode.sectionsMap.get(sec.id);
      secNode.subjects.push({
        assignmentId: a.id,
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        credits: sub.credits,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
      });
    }

    // Convert Map structure to clean JSON arrays
    const grouped = Array.from(groupedMap.values()).map((prog) => ({
      programId: prog.programId,
      programName: prog.programName,
      programCode: prog.programCode,
      durationYears: prog.durationYears,
      isActive: prog.isActive,
      academicYears: Array.from(prog.academicYearsMap.values()).map((year) => ({
        academicYearId: year.academicYearId,
        yearNumber: year.yearNumber,
        label: year.label,
        sections: Array.from(year.sectionsMap.values()),
      })),
    }));

    const result = {
      teacher: {
        id: teacher.id,
        employeeId: teacher.employeeId,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
        department: teacher.department,
      },
      grouped,
      assignments: assignments.map((a) => ({
        id: a.id,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        program: a.program,
        academicYear: a.academicYear,
        section: a.section,
        subject: a.subject,
        department: a.department,
        createdAt: a.createdAt,
      })),
      totalCount: assignments.length,
    };

    if (isDefault) {
      await setCache(cacheKey, result, 60);
    }
    return result;
  }

  async getAssignmentById(userId, assignmentId) {
    const teacher = await resolveTeacher(userId);
    const assignment = await teacherRepository.findAssignmentById(assignmentId);

    if (!assignment) {
      throw new NotFoundError('Teaching assignment not found');
    }

    // Strict ownership boundary: verify assignment belongs to authenticated teacher
    if (assignment.teacherId !== teacher.id) {
      throw new ForbiddenError('Access denied: Teaching assignment does not belong to you');
    }

    return assignment;
  }

  async getAssignedPrograms(userId) {
    const teacher = await resolveTeacher(userId);
    return teacherRepository.findProgramsByTeacher(teacher.id);
  }

  async getAssignedAcademicYears(userId, programId = null) {
    const teacher = await resolveTeacher(userId);
    return teacherRepository.findAcademicYearsByTeacher(teacher.id, programId);
  }

  async getAssignedSections(userId, academicYearId = null) {
    const teacher = await resolveTeacher(userId);
    return teacherRepository.findSectionsByTeacher(teacher.id, academicYearId);
  }

  async getAssignedSubjects(userId, filters = {}) {
    const teacher = await resolveTeacher(userId);
    return teacherRepository.findSubjectsByTeacher(teacher.id, filters);
  }

  async getStudentsBySection(userId, sectionId) {
    const teacher = await resolveTeacher(userId);
    if (!sectionId) {
      throw new BadRequestError('Section ID is required');
    }
    const students = await teacherRepository.findStudentsBySection(sectionId);
    return students;
  }

  async deleteStudent(userId, studentId, req) {
    const teacher = await resolveTeacher(userId);

    const student = await teacherRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Verify teacher is assigned to the student's section or department
    const assignments = await teacherRepository.findAssignmentsByTeacher(teacher.id);
    const hasSectionAccess = assignments.some(
      (a) => a.sectionId === student.sectionId || a.departmentId === student.departmentId
    );

    if (!hasSectionAccess) {
      throw new ForbiddenError('Access denied: You are not authorized to delete students outside your assigned sections');
    }

    await teacherRepository.deleteStudent(studentId);

    await auditService.log({
      userId,
      action: 'STUDENT_DELETED_BY_TEACHER',
      entity: 'Student',
      entityId: studentId,
      details: {
        rollNumber: student.rollNumber,
        enrollmentNumber: student.enrollmentNumber,
        sectionId: student.sectionId,
        studentName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim(),
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return { message: 'Student deleted successfully', studentId };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. Attendance Session Lifecycle (DB + Redis + QR)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createSession(userId, sessionData, req) {
    const teacher = await resolveTeacher(userId);

    const {
      teachingAssignmentId,
      duration,
      durationSeconds: reqDurationSeconds,
      durationMinutes: reqDurationMinutes,
      allowedRadius = 50,
      latitude,
      longitude,
      faceVerificationRequired = false,
      sessionType = 'REGULAR',
      allowLateScan = false,
    } = sessionData;

    // 1. Load TeachingAssignment from PostgreSQL
    const assignment = await teacherRepository.findAssignmentById(teachingAssignmentId);
    if (!assignment) {
      throw new NotFoundError('Teaching assignment not found');
    }

    // 2. Strict Security & Authorization Checks
    // - Check assignment belongs to authenticated teacher
    if (assignment.teacherId !== teacher.id) {
      throw new ForbiddenError('Access denied: You are not authorized to create a session for this teaching assignment');
    }

    // - Check assignment status is ACTIVE
    if (assignment.status !== 'ACTIVE') {
      throw new BadRequestError('Cannot create session: Teaching assignment is inactive');
    }

    // - Check teacher is active
    if (!assignment.teacher?.user?.isActive) {
      throw new BadRequestError('Cannot create session: Teacher account is inactive');
    }

    // - Check subject is active
    if (!assignment.subject?.isActive) {
      throw new BadRequestError('Cannot create session: Subject is inactive');
    }

    // - Check program is active
    if (!assignment.program?.isActive) {
      throw new BadRequestError('Cannot create session: Program is inactive');
    }

    // 3. Server strictly derives academic context from the validated assignment
    const teacherId = teacher.id;
    const subjectId = assignment.subjectId;
    const departmentId = assignment.departmentId;
    const programId = assignment.programId;
    const academicYearId = assignment.academicYearId;
    const sectionId = assignment.sectionId;

    // 4. Calculate Duration & Timestamps
    let durationSeconds = 120; // Default 2 minutes
    if (reqDurationSeconds) {
      durationSeconds = reqDurationSeconds;
    } else if (reqDurationMinutes) {
      durationSeconds = reqDurationMinutes * 60;
    } else if (duration) {
      durationSeconds = duration;
    }

    const sessionDateVal = sessionData.sessionDate ? new Date(sessionData.sessionDate) : new Date();
    const startTimeVal = sessionData.startTime ? new Date(sessionData.startTime) : new Date();
    const nowTime = new Date();
    const expiryTime = new Date(nowTime.getTime() + durationSeconds * 1000);

    // 5. Cryptographically secure random tokens (short-lived & secret-free)
    const sessionSecret = generateRandomToken(32);
    const qrToken = generateRandomToken(24);
    const qrCodeSecretHash = hashToken(sessionSecret);

    // 6. Create permanent attendance session in PostgreSQL
    const session = await teacherRepository.createAttendanceSession({
      teachingAssignmentId: assignment.id,
      teacherId,
      subjectId,
      departmentId,
      programId,
      academicYearId,
      sectionId,
      sessionDate: sessionDateVal,
      startTime: startTimeVal,
      endTime: expiryTime,
      status: 'ACTIVE',
      sessionType,
      allowedRadius: Number(allowedRadius) || 50,
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
      faceVerificationRequired: Boolean(faceVerificationRequired),
      qrCodeSecretHash,
      qrCodeTtlSeconds: 30,
      allowLateScan: Boolean(allowLateScan),
    });

    // 7. Store active session in Redis with exact TTL
    const redisKey = `attendance:session:${session.id}`;
    const redisSessionState = {
      sessionId: session.id,
      teachingAssignmentId: assignment.id,
      teacherId,
      subjectId,
      departmentId,
      programId,
      academicYearId,
      sectionId,
      startTime: startTimeVal.toISOString(),
      expiryTime: expiryTime.toISOString(),
      durationSeconds,
      status: 'ACTIVE',
      allowedRadius: session.allowedRadius,
      latitude: session.latitude,
      longitude: session.longitude,
      faceVerificationRequired: session.faceVerificationRequired,
      qrToken,
      sessionSecretHash: qrCodeSecretHash,
    };

    const redisSuccess = await setCache(redisKey, redisSessionState, durationSeconds);
    if (!redisSuccess) {
      // Fail closed policy if Redis write fails
      await teacherRepository.updateSessionStatus(session.id, 'CANCELLED', {
        endTime: new Date(),
      });
      throw new AppError(
        'Failed to initialize active attendance session in high-speed cache. Fail-closed policy triggered.',
        503
      );
    }

    // 8. Generate secure QR representation (Never contains database secrets, JWT secret, or student details)
    const qrPayload = {
      sessionId: session.id,
      token: qrToken,
      expiresAt: expiryTime.toISOString(),
      type: 'ATTENDANCE_SESSION',
    };
    const qrCodeData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

    // 9. Audit Logging
    await auditService.log({
      userId,
      action: 'ATTENDANCE_SESSION_CREATED',
      entity: 'AttendanceSession',
      entityId: session.id,
      details: {
        teachingAssignmentId: assignment.id,
        subjectId,
        sectionId,
        durationSeconds,
        faceVerificationRequired: session.faceVerificationRequired,
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return {
      session: {
        id: session.id,
        teachingAssignmentId: session.teachingAssignmentId,
        teacherId: session.teacherId,
        subjectId: session.subjectId,
        departmentId: session.departmentId,
        programId: session.programId,
        academicYearId: session.academicYearId,
        sectionId: session.sectionId,
        subject: session.subject,
        section: session.section,
        program: session.program,
        academicYear: session.academicYear,
        department: session.department,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        expiryTime: session.endTime,
        durationSeconds,
        status: session.status,
        sessionType: session.sessionType,
        allowedRadius: session.allowedRadius,
        latitude: session.latitude,
        longitude: session.longitude,
        faceVerificationRequired: session.faceVerificationRequired,
        createdAt: session.createdAt,
      },
      qr: {
        data: qrCodeData,
        payload: qrPayload,
        ttlSeconds: durationSeconds,
        expiresAt: expiryTime.toISOString(),
      },
    };
  }

  async getActiveSessions(userId) {
    const teacher = await resolveTeacher(userId);
    const dbSessions = await teacherRepository.findActiveSessionsByTeacher(teacher.id);

    const now = new Date();
    const expiredSessions = [];
    const validSessions = [];

    for (const s of dbSessions) {
      if (new Date(s.endTime) <= now) {
        expiredSessions.push(s);
      } else {
        validSessions.push(s);
      }
    }

    if (expiredSessions.length > 0) {
      await Promise.all(
        expiredSessions.map(async (s) => {
          await teacherRepository.updateSessionStatus(s.id, 'COMPLETED');
          await deleteCache(`attendance:session:${s.id}`);
        })
      );
    }

    const redisStates = await Promise.all(
      validSessions.map((s) => getCache(`attendance:session:${s.id}`))
    );

    const activeSessions = validSessions.map((s, idx) => {
      const redisState = redisStates[idx];
      const remainingSeconds = Math.max(0, Math.floor((new Date(s.endTime).getTime() - now.getTime()) / 1000));

      return {
        id: s.id,
        teachingAssignmentId: s.teachingAssignmentId,
        subject: s.subject,
        section: s.section,
        program: s.program,
        academicYear: s.academicYear,
        startTime: s.startTime,
        expiryTime: s.endTime,
        remainingSeconds,
        status: s.status,
        allowedRadius: s.allowedRadius,
        latitude: s.latitude,
        longitude: s.longitude,
        faceVerificationRequired: s.faceVerificationRequired,
        totalAttendanceMarked: s._count?.attendanceRecords || 0,
        hasActiveCache: !!redisState,
      };
    });

    return activeSessions;
  }

  async getSessions(userId, query = {}) {
    const teacher = await resolveTeacher(userId);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const { sessions, totalCount } = await teacherRepository.findSessionsByTeacher(teacher.id, {
      page,
      limit,
      status: query.status,
      assignmentId: query.assignmentId,
      subjectId: query.subjectId,
      sectionId: query.sectionId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        teachingAssignmentId: s.teachingAssignmentId,
        subject: s.subject,
        section: s.section,
        program: s.program,
        academicYear: s.academicYear,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        sessionType: s.sessionType,
        allowedRadius: s.allowedRadius,
        faceVerificationRequired: s.faceVerificationRequired,
        totalAttendanceMarked: s._count?.attendanceRecords || 0,
        createdAt: s.createdAt,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getSessionById(userId, sessionId) {
    const [teacher, session] = await Promise.all([
      resolveTeacher(userId),
      teacherRepository.findSessionById(sessionId),
    ]);

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.teacherId !== teacher.id) {
      throw new ForbiddenError('Access denied: You do not have permission to view this session');
    }

    const [redisState, summary] = await Promise.all([
      getCache(`attendance:session:${sessionId}`),
      teacherRepository.getSessionAttendanceSummary(session.id, session.sectionId),
    ]);

    return {
      session: {
        id: session.id,
        teachingAssignmentId: session.teachingAssignmentId,
        teachingAssignment: session.teachingAssignment,
        teacher: session.teacher,
        subject: session.subject,
        section: session.section,
        program: session.program,
        academicYear: session.academicYear,
        department: session.department,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        sessionType: session.sessionType,
        allowedRadius: session.allowedRadius,
        latitude: session.latitude,
        longitude: session.longitude,
        faceVerificationRequired: session.faceVerificationRequired,
        allowLateScan: session.allowLateScan,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isActiveInCache: !!redisState,
      },
      attendanceSummary: summary,
    };
  }

  async closeSession(userId, sessionId, req) {
    const [teacher, session] = await Promise.all([
      resolveTeacher(userId),
      teacherRepository.findSessionById(sessionId),
    ]);

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.teacherId !== teacher.id) {
      throw new ForbiddenError('Access denied: You do not have permission to close this session');
    }

    if (['ENDED', 'COMPLETED', 'CANCELLED'].includes(session.status)) {
      await deleteCache(`attendance:session:${sessionId}`);
      return {
        message: `Session is already ${session.status.toLowerCase()}`,
        session,
      };
    }

    const updated = await teacherRepository.updateSessionStatus(sessionId, 'ENDED', {
      endTime: new Date(),
    });

    // Remove from active Redis cache
    await deleteCache(`attendance:session:${sessionId}`);

    await auditService.log({
      userId,
      action: 'ATTENDANCE_SESSION_CLOSED',
      entity: 'AttendanceSession',
      entityId: sessionId,
      details: {
        subjectId: session.subjectId,
        sectionId: session.sectionId,
        closedAt: new Date().toISOString(),
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return {
      message: 'Attendance session closed successfully',
      session: updated,
    };
  }

  async getSessionAttendance(userId, sessionId, query = {}) {
    const [teacher, session] = await Promise.all([
      resolveTeacher(userId),
      teacherRepository.findSessionById(sessionId),
    ]);

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.teacherId !== teacher.id) {
      throw new ForbiddenError('Access denied: You do not have permission to view attendance for this session');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;

    const [recordsResult, summary] = await Promise.all([
      teacherRepository.findSessionAttendanceRecords(sessionId, {
        page,
        limit,
        status: query.status,
        search: query.search,
      }),
      teacherRepository.getSessionAttendanceSummary(sessionId, session.sectionId),
    ]);

    return {
      session: {
        id: session.id,
        subject: session.subject,
        section: session.section,
        program: session.program,
        academicYear: session.academicYear,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
      },
      summary,
      records: recordsResult.records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        rollNumber: r.student.rollNumber,
        enrollmentNumber: r.student.enrollmentNumber,
        studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
        email: r.student.user.email,
        status: r.status,
        markedAt: r.markedAt,
        markedVia: r.markedVia,
        locationLatitude: r.locationLatitude,
        locationLongitude: r.locationLongitude,
        remarks: r.remarks,
      })),
      pagination: {
        page,
        limit,
        totalCount: recordsResult.totalCount,
        totalPages: Math.ceil(recordsResult.totalCount / limit) || 1,
      },
    };
  }
  async getSectionStudentsAttendance(userId, sectionId) {
    await resolveTeacher(userId);
    if (!sectionId) throw new BadRequestError('Section ID is required');

    const students = await teacherRepository.findStudentsBySection(sectionId);

    // Fetch attendance summary for each student in parallel
    const results = await Promise.all(
      students.map(async (s) => {
        try {
          const summary = await studentRepository.getStudentAttendanceSummary(s.id, sectionId);
          return {
            studentId: s.id,
            attendancePercentage: summary.attendancePercentage ?? 0,
            presentCount: summary.presentCount ?? 0,
            totalSessions: summary.totalSessions ?? 0,
          };
        } catch {
          return { studentId: s.id, attendancePercentage: 0, presentCount: 0, totalSessions: 0 };
        }
      })
    );

    // Return as map: { [studentId]: { attendancePercentage, presentCount, totalSessions } }
    const map = {};
    results.forEach((r) => { map[r.studentId] = r; });
    return map;
  }

  async getSectionStudentsSubjectAttendance(userId, sectionId, subjectId, filters = {}) {
    await resolveTeacher(userId);
    if (!sectionId)  throw new BadRequestError('Section ID is required');
    if (!subjectId)  throw new BadRequestError('Subject ID is required');

    const students = await teacherRepository.findStudentsBySection(sectionId);
    if (!students.length) return [];

    let dateFilter = null;
    const targetDate = filters.date || (filters.startDate && filters.startDate === filters.endDate ? filters.startDate : null);

    if (targetDate) {
      const d = targetDate.includes('T') ? targetDate.split('T')[0] : targetDate;
      dateFilter = {
        gte: new Date(d + 'T00:00:00.000Z'),
        lte: new Date(d + 'T23:59:59.999Z'),
      };
    } else if (filters.startDate || filters.endDate) {
      const range = {};
      if (filters.startDate) {
        const s = filters.startDate.includes('T') ? filters.startDate.split('T')[0] : filters.startDate;
        range.gte = new Date(s + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        const e = filters.endDate.includes('T') ? filters.endDate.split('T')[0] : filters.endDate;
        range.lte = new Date(e + 'T23:59:59.999Z');
      }
      dateFilter = range;
    }

    const sessionWhere = {
      sectionId,
      subjectId,
      status: { in: ['ACTIVE', 'ENDED', 'COMPLETED'] },
      ...(dateFilter ? { sessionDate: dateFilter } : {}),
    };

    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      select: { id: true, sessionDate: true, startTime: true, endTime: true },
      orderBy: { sessionDate: 'asc' },
    });

    const totalSessions = sessions.length;
    const sessionIds = sessions.map(s => s.id);

    let records = [];
    if (sessionIds.length > 0) {
      records = await prisma.attendanceRecord.findMany({
        where: {
          sessionId: { in: sessionIds },
          studentId: { in: students.map(s => s.id) },
        },
        select: {
          studentId: true,
          sessionId: true,
          status: true,
        },
      });
    }

    const studentList = students.map(s => {
      const studentRecords = records.filter(r => r.studentId === s.id);
      const presentCount = studentRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const absentCount = totalSessions >= presentCount ? totalSessions - presentCount : 0;
      const pct = totalSessions > 0 ? Number(((presentCount / totalSessions) * 100).toFixed(1)) : 0;

      return {
        id: s.id,
        studentId: s.id,
        studentName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || 'Student',
        email: s.user?.email || '',
        rollNumber: s.rollNumber || '',
        enrollmentNumber: s.enrollmentNumber || '',
        totalClasses: totalSessions,
        totalSessions,
        presentCount,
        totalPresent: presentCount,
        absentCount,
        totalAbsent: absentCount,
        attendancePercentage: pct,
        percentage: pct,
        dailyStatus: totalSessions > 0 ? (presentCount > 0 ? 'PRESENT' : 'ABSENT') : 'NO_CLASS',
      };
    });

    studentList.forEach(item => {
      studentList[item.studentId] = item;
    });

    return studentList;
  }
}

export default new TeacherService();

