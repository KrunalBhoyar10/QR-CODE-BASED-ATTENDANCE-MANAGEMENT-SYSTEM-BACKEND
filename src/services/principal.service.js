import crypto from 'crypto';
import userRepository from '../repositories/user.repository.js';
import departmentRepository from '../repositories/department.repository.js';
import programRepository from '../repositories/program.repository.js';
import academicYearRepository from '../repositories/academicYear.repository.js';
import sectionRepository from '../repositories/section.repository.js';
import attendanceRepository from '../repositories/attendance.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import auditService from './audit.service.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors.js';

export const generateTemporaryPassword = () => {
  const lettersUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lettersLower = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%^&*';
  const allChars = lettersUpper + lettersLower + numbers + specials;

  let pwd = '';
  pwd += lettersUpper[crypto.randomInt(0, lettersUpper.length)];
  pwd += lettersLower[crypto.randomInt(0, lettersLower.length)];
  pwd += numbers[crypto.randomInt(0, numbers.length)];
  pwd += specials[crypto.randomInt(0, specials.length)];

  for (let i = 0; i < 8; i++) {
    pwd += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Cryptographically secure Fisher-Yates shuffle (never use Math.random() for passwords)
  const arr = pwd.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

class PrincipalService {
  /**
   * Get Principal Profile
   */
  async getProfile(principalId) {
    const principal = await userRepository.findById(principalId);
    if (!principal) {
      throw new NotFoundError('Principal profile not found');
    }

    return {
      id: principal.id,
      email: principal.email,
      firstName: principal.firstName,
      lastName: principal.lastName,
      role: principal.role,
      phoneNumber: principal.phoneNumber,
      avatarUrl: principal.avatarUrl,
      isActive: principal.isActive,
      lastLoginAt: principal.lastLoginAt,
      createdAt: principal.createdAt,
      updatedAt: principal.updatedAt,
    };
  }

  /**
   * Update Principal Profile
   */
  async updateProfile(principalId, profileData, req) {
    const existing = await userRepository.findById(principalId);
    if (!existing) {
      throw new NotFoundError('Principal user not found');
    }

    const updated = await userRepository.update(principalId, {
      ...(profileData.firstName && { firstName: profileData.firstName.trim() }),
      ...(profileData.lastName && { lastName: profileData.lastName.trim() }),
      ...(profileData.phoneNumber !== undefined && { phoneNumber: profileData.phoneNumber }),
      ...(profileData.avatarUrl !== undefined && { avatarUrl: profileData.avatarUrl }),
    });

    await auditService.log({
      userId: principalId,
      action: 'PRINCIPAL_PROFILE_UPDATED',
      entity: 'User',
      entityId: principalId,
      details: { updatedFields: Object.keys(profileData) },
      req,
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      phoneNumber: updated.phoneNumber,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Principal Change Password
   */
  async changePassword({ principalId, currentPassword, newPassword, req }) {
    const user = await userRepository.findById(principalId);
    if (!user) {
      throw new NotFoundError('Principal user not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.updatePasswordWithFlag(principalId, newPasswordHash, false);

    // Invalidate prior sessions
    await refreshTokenRepository.revokeAllUserTokens(principalId);

    await auditService.log({
      userId: principalId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: principalId,
      details: { role: 'PRINCIPAL' },
      req,
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  /**
   * Create HOD
   */
  async createHod({ principalId, data, req }) {
    const {
      firstName,
      lastName,
      email,
      departmentId,
      password,
      phoneNumber,
      isActive = true,
      mustChangePassword = true,
    } = data;

    // 1. Verify department exists
    const department = await departmentRepository.findById(departmentId);
    if (!department) {
      throw new NotFoundError(`Department with ID ${departmentId} does not exist`);
    }

    // 2. Verify email uniqueness
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(`User with email '${email}' already exists`);
    }

    // 3. Resolve password (custom or secure temporary password)
    const initialPlainPassword = password || generateTemporaryPassword();
    const passwordHash = await hashPassword(initialPlainPassword);

    // 4. Create HOD and bind to department atomically
    const createdHod = await userRepository.createHodWithDepartment({
      userData: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        phoneNumber: phoneNumber || null,
        isActive,
        mustChangePassword,
      },
      departmentId,
    });

    // 5. Audit log
    await auditService.log({
      userId: principalId,
      action: 'HOD_CREATED',
      entity: 'User',
      entityId: createdHod.id,
      details: {
        hodEmail: createdHod.email,
        departmentId,
        departmentName: department.name,
        mustChangePassword,
      },
      req,
    });

    return {
      hod: {
        id: createdHod.id,
        email: createdHod.email,
        firstName: createdHod.firstName,
        lastName: createdHod.lastName,
        role: createdHod.role,
        phoneNumber: createdHod.phoneNumber,
        isActive: createdHod.isActive,
        mustChangePassword: createdHod.mustChangePassword,
        headedDepartment: createdHod.headedDepartment,
        createdAt: createdHod.createdAt,
      },
      ...(password ? {} : { temporaryPassword: initialPlainPassword }),
      message: 'HOD created and assigned to department successfully',
    };
  }

  /**
   * List HODs with pagination and filters
   */
  async listHods({ page = 1, limit = 10, search, departmentId, isActive }) {
    const [hods, totalCount] = await Promise.all([
      userRepository.findHods({ page, limit, search, departmentId, isActive }),
      userRepository.countHods({ search, departmentId, isActive }),
    ]);

    return {
      hods: hods.map((hod) => ({
        id: hod.id,
        email: hod.email,
        firstName: hod.firstName,
        lastName: hod.lastName,
        phoneNumber: hod.phoneNumber,
        role: hod.role,
        isActive: hod.isActive,
        mustChangePassword: hod.mustChangePassword,
        lastLoginAt: hod.lastLoginAt,
        headedDepartment: hod.headedDepartment || null,
        createdAt: hod.createdAt,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * View HOD Details
   */
  async getHodById(hodId) {
    const hod = await userRepository.findHodById(hodId);
    if (!hod) {
      throw new NotFoundError(`HOD with ID '${hodId}' not found`);
    }

    return {
      id: hod.id,
      email: hod.email,
      firstName: hod.firstName,
      lastName: hod.lastName,
      phoneNumber: hod.phoneNumber,
      role: hod.role,
      isActive: hod.isActive,
      mustChangePassword: hod.mustChangePassword,
      lastLoginAt: hod.lastLoginAt,
      createdAt: hod.createdAt,
      updatedAt: hod.updatedAt,
      headedDepartment: hod.headedDepartment || null,
    };
  }

  /**
   * Update HOD details / department assignment
   */
  async updateHod({ principalId, hodId, data, req }) {
    const existingHod = await userRepository.findHodById(hodId);
    if (!existingHod) {
      throw new NotFoundError(`HOD with ID '${hodId}' not found`);
    }

    // Verify email uniqueness if being updated
    if (data.email && data.email.toLowerCase() !== existingHod.email.toLowerCase()) {
      const emailTaken = await userRepository.findByEmail(data.email);
      if (emailTaken) {
        throw new ConflictError(`Email '${data.email}' is already in use`);
      }
    }

    // Verify department exists if being updated
    if (data.departmentId) {
      const dept = await departmentRepository.findById(data.departmentId);
      if (!dept) {
        throw new NotFoundError(`Target department '${data.departmentId}' not found`);
      }
    }

    const { departmentId, ...userData } = data;
    const updatedHod = await userRepository.updateHod(hodId, {
      userData,
      departmentId,
    });

    await auditService.log({
      userId: principalId,
      action: 'HOD_UPDATED',
      entity: 'User',
      entityId: hodId,
      details: {
        updatedFields: Object.keys(data),
        departmentId: departmentId || existingHod.headedDepartment?.id,
      },
      req,
    });

    return {
      id: updatedHod.id,
      email: updatedHod.email,
      firstName: updatedHod.firstName,
      lastName: updatedHod.lastName,
      phoneNumber: updatedHod.phoneNumber,
      role: updatedHod.role,
      isActive: updatedHod.isActive,
      mustChangePassword: updatedHod.mustChangePassword,
      headedDepartment: updatedHod.headedDepartment || null,
      updatedAt: updatedHod.updatedAt,
    };
  }

  /**
   * Update HOD Status (Active / Inactive)
   */
  async updateHodStatus({ principalId, hodId, isActive, reason, req }) {
    const existingHod = await userRepository.findHodById(hodId);
    if (!existingHod) {
      throw new NotFoundError(`HOD with ID '${hodId}' not found`);
    }

    const updatedHod = await userRepository.updateHodStatus(hodId, isActive);

    // If deactivated, revoke all refresh tokens immediately
    if (!isActive) {
      await refreshTokenRepository.revokeAllUserTokens(hodId);
    }

    await auditService.log({
      userId: principalId,
      action: 'HOD_STATUS_CHANGED',
      entity: 'User',
      entityId: hodId,
      details: {
        previousStatus: existingHod.isActive,
        newStatus: isActive,
        reason: reason || 'Status updated by Principal',
      },
      req,
    });

    return {
      id: updatedHod.id,
      email: updatedHod.email,
      firstName: updatedHod.firstName,
      lastName: updatedHod.lastName,
      isActive: updatedHod.isActive,
      headedDepartment: updatedHod.headedDepartment || null,
      message: `HOD status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
    };
  }

  /**
   * Reset HOD Password (Temporary password flow)
   */
  async resetHodPassword({ principalId, hodId, temporaryPassword, req }) {
    const hod = await userRepository.findHodById(hodId);
    if (!hod) {
      throw new NotFoundError(`HOD with ID '${hodId}' not found`);
    }

    const tempPassword = temporaryPassword || generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Update password, force mustChangePassword: true
    await userRepository.updatePasswordWithFlag(hodId, passwordHash, true);

    // Invalidate all existing sessions/refresh tokens for security
    await refreshTokenRepository.revokeAllUserTokens(hodId);

    await auditService.log({
      userId: principalId,
      action: 'HOD_PASSWORD_RESET',
      entity: 'User',
      entityId: hodId,
      details: { hodEmail: hod.email },
      req,
    });

    return {
      message: 'HOD password reset successfully. HOD must change password upon next login.',
      temporaryPassword: tempPassword,
    };
  }

  /**
   * Academic Hierarchy: View Departments
   */
  async getDepartments() {
    return departmentRepository.findAll();
  }

  /**
   * Academic Hierarchy: View Department Details
   */
  async getDepartmentById(departmentId) {
    const dept = await departmentRepository.findById(departmentId);
    if (!dept) {
      throw new NotFoundError(`Department with ID '${departmentId}' not found`);
    }
    return dept;
  }

  /**
   * Academic Hierarchy: View Programs in Department
   */
  async getProgramsByDepartment(departmentId) {
    const dept = await departmentRepository.findById(departmentId);
    if (!dept) {
      throw new NotFoundError(`Department with ID '${departmentId}' not found`);
    }
    return programRepository.findAllByDepartment(departmentId);
  }

  /**
   * Academic Hierarchy: View Academic Years in Program
   */
  async getAcademicYearsByProgram(programId) {
    const program = await programRepository.findById(programId);
    if (!program) {
      throw new NotFoundError(`Program with ID '${programId}' not found`);
    }
    return academicYearRepository.findAllByProgram(programId);
  }

  /**
   * Academic Hierarchy: View Sections in Academic Year
   */
  async getSectionsByAcademicYear(academicYearId) {
    const academicYear = await academicYearRepository.findById(academicYearId);
    if (!academicYear) {
      throw new NotFoundError(`Academic year with ID '${academicYearId}' not found`);
    }
    return sectionRepository.findAllByAcademicYear(academicYearId);
  }

  /**
   * Attendance Analytics: Overall Summary
   */
  async getAttendanceSummary(filters) {
    return attendanceRepository.getOverallSummary(filters);
  }

  /**
   * Attendance Analytics: Department-wise
   */
  async getDepartmentWiseAttendance(filters) {
    return attendanceRepository.getDepartmentWiseAttendance(filters);
  }

  /**
   * Attendance Analytics: Program-wise
   */
  async getProgramWiseAttendance(filters) {
    return attendanceRepository.getProgramWiseAttendance(filters);
  }

  /**
   * Attendance Analytics: Academic Year-wise
   */
  async getAcademicYearWiseAttendance(filters) {
    return attendanceRepository.getAcademicYearWiseAttendance(filters);
  }

  /**
   * Attendance Analytics: Section-wise
   */
  async getSectionWiseAttendance(filters) {
    return attendanceRepository.getSectionWiseAttendance(filters);
  }

  /**
   * Attendance Analytics: Subject-wise
   */
  async getSubjectWiseAttendance(filters) {
    return attendanceRepository.getSubjectWiseAttendance(filters);
  }

  /**
   * Attendance Analytics: Low-Attendance Reporting
   */
  async getLowAttendance(filters) {
    const { type, ...restFilters } = filters;

    if (type === 'subjects') {
      return attendanceRepository.getLowAttendanceSubjects(restFilters);
    }

    if (type === 'students') {
      return attendanceRepository.getLowAttendanceStudents(restFilters);
    }

    // Default: Return both students and subjects breakdown
    const [studentsReport, subjectsReport] = await Promise.all([
      attendanceRepository.getLowAttendanceStudents(restFilters),
      attendanceRepository.getLowAttendanceSubjects(restFilters),
    ]);

    return {
      threshold: studentsReport.threshold,
      students: studentsReport.students,
      subjects: subjectsReport.subjects,
      studentPagination: studentsReport.pagination,
      subjectPagination: subjectsReport.pagination,
    };
  }

  /**
   * Comprehensive Reports Summary
   */
  async getReportsSummary(filters) {
    const [summary, departments, lowAttendance] = await Promise.all([
      attendanceRepository.getOverallSummary(filters),
      attendanceRepository.getDepartmentWiseAttendance(filters),
      attendanceRepository.getLowAttendanceStudents({ ...filters, limit: 10 }),
    ]);

    return {
      summary,
      departmentBreakdown: departments,
      criticalLowAttendanceStudents: lowAttendance.students,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default new PrincipalService();
