import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import studentRepository from '../repositories/student.repository.js';
import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import passwordResetTokenRepository from '../repositories/passwordResetToken.repository.js';
import faceVerificationService from './faceVerification.service.js';
import auditService from './audit.service.js';
import { getCache, deleteCache } from '../lib/redis.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';
import { verifyGeofence } from '../utils/geo.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  AppError,
} from '../utils/errors.js';

// ============================================================
// Helper: Resolve & Validate Student Context
// ============================================================

const resolveStudent = async (userId) => {
  const student = await studentRepository.findStudentByUserId(userId);
  if (!student) {
    throw new ForbiddenError('Authenticated user does not have a linked student profile');
  }
  if (!student.user?.isActive) {
    throw new ForbiddenError('Student user account is inactive');
  }
  return student;
};

// ============================================================
// Student Service Class
// ============================================================

class StudentService {
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Profile & Institutional Identity
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getProfile(userId) {
    const student = await resolveStudent(userId);

    return {
      id: student.id,
      userId: student.userId,
      rollNumber: student.rollNumber,
      enrollmentNumber: student.enrollmentNumber,
      email: student.user.email,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      phoneNumber: student.user.phoneNumber,
      avatarUrl: student.user.avatarUrl,
      isActive: student.user.isActive,
      mustChangePassword: student.user.mustChangePassword,
      lastLoginAt: student.user.lastLoginAt,
      department: student.department
        ? {
            id: student.department.id,
            name: student.department.name,
            code: student.department.code,
          }
        : null,
      program: student.program
        ? {
            id: student.program.id,
            name: student.program.name,
            code: student.program.code,
            durationYears: student.program.durationYears,
            isActive: student.program.isActive,
          }
        : null,
      academicYear: student.academicYear
        ? {
            id: student.academicYear.id,
            yearNumber: student.academicYear.yearNumber,
            label: student.academicYear.label,
          }
        : null,
      section: student.section
        ? {
            id: student.section.id,
            name: student.section.name,
            capacity: student.section.capacity,
          }
        : null,
      activeEnrollments: (student.enrollments || []).map((e) => ({
        id: e.id,
        academicSession: e.academicSession,
        academicYear: e.academicYear,
        section: e.section,
        status: e.status,
      })),
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  async updateProfile(userId, profileData, req) {
    await resolveStudent(userId);

    const updated = await studentRepository.updateStudentProfile(userId, {
      firstName: profileData.firstName?.trim(),
      lastName: profileData.lastName?.trim(),
      phoneNumber: profileData.phoneNumber,
      avatarUrl: profileData.avatarUrl,
    });

    await auditService.log({
      userId,
      action: 'STUDENT_PROFILE_UPDATED',
      entity: 'Student',
      entityId: updated.id,
      details: { updatedFields: Object.keys(profileData) },
      req,
    });

    return {
      id: updated.id,
      userId: updated.userId,
      rollNumber: updated.rollNumber,
      enrollmentNumber: updated.enrollmentNumber,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      phoneNumber: updated.user.phoneNumber,
      avatarUrl: updated.user.avatarUrl,
      isActive: updated.user.isActive,
      department: updated.department,
      program: updated.program,
      academicYear: updated.academicYear,
      section: updated.section,
      updatedAt: updated.user.updatedAt,
    };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. Password Management (Change & Reset)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      details: { role: 'STUDENT' },
      req,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword({ email, req }) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Do not disclose whether email exists or not to prevent user enumeration
      return {
        message: 'If an account exists with this email, password reset instructions have been generated.',
      };
    }

    if (!user.isActive) {
      throw new BadRequestError('Account has been deactivated. Please contact your administrator.');
    }

    // Revoke any previous unused reset tokens for this user
    await passwordResetTokenRepository.revokeAllForUser(user.id);

    // Generate random 32-byte token and hash it for DB storage
    const resetToken = generateRandomToken(32);
    const tokenHash = hashToken(resetToken);

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await passwordResetTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    await auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'PasswordResetToken',
      entityId: user.id,
      details: { email: user.email },
      req,
    });

    // SECURITY: Do NOT expose the raw reset token in the HTTP response in production.
    // In production this token must be delivered via email/SMS.
    if (process.env.NODE_ENV !== 'production') {
      return {
        message: 'Password reset token generated successfully.',
        resetToken,  // Dev only â€” must be emailed in production
        expiresAt: expiresAt.toISOString(),
      };
    }

    return {
      message: 'If an account exists with this email, password reset instructions have been generated.',
    };
  }

  async resetPassword({ token, newPassword, req }) {
    if (!token) {
      throw new BadRequestError('Password reset token is required');
    }

    const tokenHash = hashToken(token);
    const tokenRecord = await passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord || tokenRecord.isUsed) {
      throw new BadRequestError('Invalid or already used password reset token');
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new BadRequestError('Password reset token has expired');
    }

    const user = tokenRecord.user;
    if (!user || !user.isActive) {
      throw new BadRequestError('User account is invalid or deactivated');
    }

    const newHash = await hashPassword(newPassword);
    await userRepository.updatePasswordWithFlag(user.id, newHash, false);

    // Mark token as used
    await passwordResetTokenRepository.markAsUsed(tokenRecord.id);

    // Revoke all existing sessions
    await refreshTokenRepository.revokeAllForUser(user.id);

    await auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user.id,
      details: { role: user.role },
      req,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. Enrollment Info
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getEnrollments(userId) {
    const student = await resolveStudent(userId);
    const enrollments = await studentRepository.findEnrollmentsByStudent(student.id);

    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      enrollmentNumber: student.enrollmentNumber,
      department: student.department,
      program: student.program,
      enrollments,
    };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 4. Attendance Marking via QR Scan (Core Attendance Flow)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async markAttendance(userId, attendanceData, req) {
    // 1. Authenticate & Resolve Student Identity
    const student = await resolveStudent(userId);

    const {
      sessionId,
      sessionToken: rawSessionToken,
      token: rawToken,
      latitude,
      longitude,
      faceVerificationData,
    } = attendanceData;

    const sessionToken = rawSessionToken || rawToken;

    if (!sessionId) {
      throw new BadRequestError('Session ID is required');
    }
    if (!sessionToken) {
      throw new BadRequestError('Session token is required');
    }

    // 2. Fetch Active Session from Redis or DB
    const redisKey = `attendance:session:${sessionId}`;
    const redisState = await getCache(redisKey);

    const session = await studentRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    // 3. Validate Session State & Expiration
    if (session.status !== 'ACTIVE') {
      throw new BadRequestError(`Cannot mark attendance: Session is ${session.status.toLowerCase()}`);
    }

    const now = new Date();
    if (now > new Date(session.endTime)) {
      // Auto-complete expired session
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      });
      await deleteCache(redisKey);
      throw new BadRequestError('Attendance session has expired');
    }

    // 4. Validate QR Token Cryptographically (Server-side)
    let isTokenValid = false;

    if (redisState && redisState.qrToken) {
      if (redisState.qrToken === sessionToken) {
        isTokenValid = true;
      }
    }

    if (!isTokenValid && session.qrCodeSecretHash) {
      const computedHash = hashToken(sessionToken);
      if (computedHash === session.qrCodeSecretHash) {
        isTokenValid = true;
      }
    }

    if (!isTokenValid && redisState?.sessionSecretHash) {
      const computedHash = hashToken(sessionToken);
      if (computedHash === redisState.sessionSecretHash) {
        isTokenValid = true;
      }
    }

    if (!isTokenValid) {
      throw new BadRequestError('Invalid or expired QR session token');
    }

    // 5. Validate Teaching Assignment & Related Entities Status
    if (session.teachingAssignment && session.teachingAssignment.status !== 'ACTIVE') {
      throw new BadRequestError('Cannot mark attendance: Teaching assignment is inactive');
    }
    if (session.teacher?.user?.isActive === false) {
      throw new BadRequestError('Cannot mark attendance: Teacher account is inactive');
    }
    if (session.subject?.isActive === false) {
      throw new BadRequestError('Cannot mark attendance: Subject is inactive');
    }

    // 6. Strict Academic Enrollment Verification (Server-Enforced)
    // - Verify Department Match
    if (session.departmentId && student.departmentId !== session.departmentId) {
      throw new ForbiddenError('Enrollment mismatch: You do not belong to the department for this session');
    }

    // - Verify Program Match (e.g. BCA vs MCA)
    if (session.programId && student.programId !== session.programId) {
      throw new ForbiddenError('Enrollment mismatch: You do not belong to the academic program for this session');
    }

    // - Verify Academic Year Match (e.g. 1st Year vs 2nd Year)
    if (session.academicYearId && student.academicYearId !== session.academicYearId) {
      throw new ForbiddenError('Enrollment mismatch: You are not enrolled in the academic year for this session');
    }

    // - Verify Section Match (e.g. Section A vs Section B)
    if (session.sectionId && student.sectionId !== session.sectionId) {
      throw new ForbiddenError('Enrollment mismatch: You are not enrolled in the section for this session');
    }

    // - Verify Active Student Enrollment Record
    const activeEnrollment = await studentRepository.findActiveEnrollment(
      student.id,
      session.academicYearId || student.academicYearId,
      session.sectionId || student.sectionId
    );

    if (!activeEnrollment && (!student.enrollments || student.enrollments.length === 0)) {
      throw new ForbiddenError('Enrollment mismatch: No active student enrollment found for this session');
    }

    // 7. Server-Side Geolocation & Geofencing Verification
    // The backend calculates actual distance â€” never trusting client flags
    if (session.latitude !== null && session.longitude !== null) {
      if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        throw new BadRequestError('Location coordinates (latitude and longitude) are required for this session');
      }

      const numLat = Number(latitude);
      const numLon = Number(longitude);

      if (isNaN(numLat) || isNaN(numLon) || numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) {
        throw new BadRequestError('Invalid GPS coordinates provided');
      }

      const allowedRadius = session.allowedRadius || 50;
      const { isWithin, distanceMeters, allowedRadiusMeters } = verifyGeofence(
        numLat,
        numLon,
        session.latitude,
        session.longitude,
        allowedRadius
      );

      if (!isWithin) {
        throw new BadRequestError(
          `Geofence validation failed: You are outside the allowed radius (${distanceMeters}m away, maximum allowed ${allowedRadiusMeters}m)`
        );
      }
    }

    // 8. Face Verification (Modular & Privacy-Preserving)
    if (session.faceVerificationRequired) {
      const faceResult = await faceVerificationService.verify({
        studentId: student.id,
        session,
        faceVerificationData,
        req,
      });

      if (!faceResult.verified) {
        throw new BadRequestError(
          `Face verification failed: ${faceResult.reason || 'Biometric identity could not be verified'}`
        );
      }
    }

    // 9. Application-Level Duplicate Check
    const existingRecord = await studentRepository.findAttendanceRecord(student.id, session.id);
    if (existingRecord) {
      throw new ConflictError('Attendance has already been marked for this session');
    }

    // 10. Atomic PostgreSQL Transaction & Database-Level Uniqueness Enforcement
    let record;
    try {
      record = await prisma.$transaction(async (tx) => {
        const [lockedSession] = await tx.$queryRaw`
          SELECT "status"
          FROM "attendance_sessions"
          WHERE "id" = ${session.id}
          FOR UPDATE
        `;

        if (!lockedSession || lockedSession.status !== 'ACTIVE') {
          const status = lockedSession?.status?.toLowerCase() || 'unavailable';
          throw new BadRequestError(`Cannot mark attendance: Session is ${status}`);
        }

        // Double-check existence inside transaction to avoid race conditions
        const inTxRecord = await tx.attendanceRecord.findUnique({
          where: {
            studentId_sessionId: {
              studentId: student.id,
              sessionId: session.id,
            },
          },
        });

        if (inTxRecord) {
          throw new ConflictError('Attendance has already been marked for this session');
        }

        return tx.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: 'PRESENT',
            markedVia: 'QR_SCAN',
            locationLatitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
            locationLongitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
            userAgent: req?.headers?.['user-agent'] || null,
            remarks: `Verified via QR Scan${session.faceVerificationRequired ? ' & Face Verification' : ''}${session.latitude !== null ? ' & Geofence' : ''}`,
          },
          include: {
            session: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
                section: { select: { id: true, name: true } },
                teacher: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        });
      });
    } catch (error) {
      // Catch PostgreSQL unique constraint violation (code P2002) for race condition safety
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Attendance has already been marked for this session');
      }
      throw error;
    }

    // 11. Audit Logging
    await auditService.log({
      userId,
      action: 'ATTENDANCE_MARKED',
      entity: 'AttendanceRecord',
      entityId: record.id,
      details: {
        sessionId: session.id,
        subjectId: session.subjectId,
        studentId: student.id,
        status: record.status,
        markedVia: record.markedVia,
      },
      req,
    });

    return {
      id: record.id,
      sessionId: record.sessionId,
      studentId: record.studentId,
      status: record.status,
      markedAt: record.markedAt,
      markedVia: record.markedVia,
      session: {
        id: session.id,
        subject: record.session.subject,
        section: record.session.section,
        teacher: record.session.teacher?.user
          ? `${record.session.teacher.user.firstName} ${record.session.teacher.user.lastName}`
          : (typeof record.session.teacher === 'string' ? record.session.teacher : 'Teacher'),
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      },
      verificationDetails: {
        qrVerified: true,
        enrollmentVerified: true,
        locationVerified: session.latitude !== null,
        faceVerified: session.faceVerificationRequired,
      },
    };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 5. Attendance Summary & Reports
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAttendanceSummary(userId) {
    const student = await resolveStudent(userId);
    return studentRepository.getStudentAttendanceSummary(student.id, student.sectionId);
  }

  async getSubjectWiseAttendance(userId) {
    const student = await resolveStudent(userId);
    return studentRepository.getStudentSubjectWiseAttendance(
      student.id,
      student.sectionId,
      student.programId
    );
  }

  async getAttendanceHistory(userId, query = {}) {
    const student = await resolveStudent(userId);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const { records, totalCount } = await studentRepository.getStudentAttendanceHistory(student.id, {
      page,
      limit,
      startDate: query.startDate,
      endDate: query.endDate,
      status: query.status,
      subjectId: query.subjectId,
    });

    return {
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        status: r.status,
        markedAt: r.markedAt,
        markedVia: r.markedVia,
        locationLatitude: r.locationLatitude,
        locationLongitude: r.locationLongitude,
        remarks: r.remarks,
        session: {
          id: r.session.id,
          sessionDate: r.session.sessionDate,
          startTime: r.session.startTime,
          endTime: r.session.endTime,
          subject: r.session.subject,
          section: r.session.section,
          teacher: r.session.teacher?.user
            ? `${r.session.teacher.user.firstName} ${r.session.teacher.user.lastName}`
            : (typeof r.session.teacher === 'string' ? r.session.teacher : 'Teacher'),
        },
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }
  async checkSessionStatus(userId, sessionId) {
    const student = await resolveStudent(userId);
    const session = await studentRepository.findSessionById(sessionId);
    if (!session) {
      return { sessionActive: false, alreadyMarked: false, reason: 'Session not found.' };
    }
    const sessionActive = session.status === 'ACTIVE';
    const existingRecord = await studentRepository.findAttendanceRecord(student.id, sessionId);
    return {
      sessionActive,
      alreadyMarked: Boolean(existingRecord),
      sessionStatus: session.status,
    };
  }

}
export default new StudentService();
