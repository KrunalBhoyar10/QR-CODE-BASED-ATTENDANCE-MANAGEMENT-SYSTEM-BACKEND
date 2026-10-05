import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import hodRepository from '../repositories/hod.repository.js';
import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import attendanceRepository from '../repositories/attendance.repository.js';
import auditService from './audit.service.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors.js';

// ============================================================
// Helpers
// ============================================================

const generateTemporaryPassword = () => {
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
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Resolve the HOD's departmentId from the authenticated user context.
 * Throws ForbiddenError if the user is not assigned to a department.
 */
const resolveHodDepartment = async (userId) => {
  const user = await userRepository.findByIdWithProfiles(userId);
  if (!user || !user.headedDepartment?.id) {
    throw new ForbiddenError(
      'HOD is not assigned to any department. Contact the Principal to assign your department.'
    );
  }
  return user.headedDepartment.id;
};

// ============================================================
// HOD Service Class
// ============================================================

class HodService {
  // ─────────────────────────────────────────────────────────
  // 1. HOD Profile & Password
  // ─────────────────────────────────────────────────────────

  async getProfile(hodUserId) {
    const user = await userRepository.findByIdWithProfiles(hodUserId);
    if (!user) throw new NotFoundError('HOD profile not found');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      department: user.headedDepartment
        ? {
            id: user.headedDepartment.id,
            name: user.headedDepartment.name,
            code: user.headedDepartment.code,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(hodUserId, profileData, req) {
    const existing = await userRepository.findById(hodUserId);
    if (!existing) throw new NotFoundError('HOD user not found');

    const updated = await userRepository.update(hodUserId, {
      ...(profileData.firstName && { firstName: profileData.firstName.trim() }),
      ...(profileData.lastName && { lastName: profileData.lastName.trim() }),
      ...(profileData.phoneNumber !== undefined && { phoneNumber: profileData.phoneNumber }),
      ...(profileData.avatarUrl !== undefined && { avatarUrl: profileData.avatarUrl }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_PROFILE_UPDATED',
      entity: 'User',
      entityId: hodUserId,
      details: { updatedFields: Object.keys(profileData) },
      req,
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt,
    };
  }

  async changePassword({ hodUserId, currentPassword, newPassword, req }) {
    const user = await userRepository.findById(hodUserId);
    if (!user) throw new NotFoundError('HOD user not found');

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestError('Current password does not match');

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.updatePasswordWithFlag(hodUserId, newPasswordHash, false);
    await refreshTokenRepository.revokeAllUserTokens(hodUserId);

    await auditService.log({
      userId: hodUserId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: hodUserId,
      details: { role: 'HOD' },
      req,
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ─────────────────────────────────────────────────────────
  // 2. Programs
  // ─────────────────────────────────────────────────────────

  async listPrograms(hodUserId, { isActive } = {}) {
    const departmentId = await resolveHodDepartment(hodUserId);
    return hodRepository.findProgramsByDepartment(departmentId, { isActive });
  }

  async getProgramById(hodUserId, programId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const program = await hodRepository.findProgramById(programId);
    if (!program) throw new NotFoundError(`Program '${programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this program');
    }
    return program;
  }

  async createProgram(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // Duplicate code check within same department
    const existing = await hodRepository.findProgramByCode(departmentId, data.code);
    if (existing) {
      throw new ConflictError(`Program with code '${data.code.toUpperCase()}' already exists in your department`);
    }

    const program = await hodRepository.createProgram({
      name: data.name.trim(),
      code: data.code.trim(),
      durationYears: data.durationYears || 3,
      isActive: data.isActive !== undefined ? data.isActive : true,
      departmentId,
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_PROGRAM_CREATED',
      entity: 'Program',
      entityId: program.id,
      details: { programName: program.name, departmentId },
      req,
    });

    return program;
  }

  async updateProgram(hodUserId, programId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const program = await hodRepository.findProgramById(programId);
    if (!program) throw new NotFoundError(`Program '${programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this program');
    }

    // If code is changing, check uniqueness
    if (data.code && data.code.toUpperCase() !== program.code) {
      const existing = await hodRepository.findProgramByCode(departmentId, data.code);
      if (existing) {
        throw new ConflictError(`Program code '${data.code.toUpperCase()}' already exists in your department`);
      }
    }

    const updated = await hodRepository.updateProgram(programId, {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.code !== undefined && { code: data.code.trim() }),
      ...(data.durationYears !== undefined && { durationYears: data.durationYears }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_PROGRAM_UPDATED',
      entity: 'Program',
      entityId: programId,
      details: { updatedFields: Object.keys(data) },
      req,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // 3. Academic Years
  // ─────────────────────────────────────────────────────────

  async listAcademicYears(hodUserId, programId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    // Verify program belongs to HOD's department
    const program = await hodRepository.findProgramById(programId);
    if (!program) throw new NotFoundError(`Program '${programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this program');
    }
    return hodRepository.findAcademicYearsByProgram(programId);
  }

  async getAcademicYearById(hodUserId, academicYearId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const academicYear = await hodRepository.findAcademicYearById(academicYearId);
    if (!academicYear) throw new NotFoundError(`Academic year '${academicYearId}' not found`);
    if (academicYear.program?.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this academic year');
    }
    return academicYear;
  }

  async createAcademicYear(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // Verify program belongs to HOD's department
    const program = await hodRepository.findProgramById(data.programId);
    if (!program) throw new NotFoundError(`Program '${data.programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('This program does not belong to your department');
    }

    // Duplicate year check within same program
    const existingYear = await hodRepository.findAcademicYearByProgramAndNumber(
      data.programId,
      data.yearNumber
    );
    if (existingYear) {
      throw new ConflictError(
        `Year ${data.yearNumber} already exists in program '${program.name}'`
      );
    }

    const academicYear = await hodRepository.createAcademicYear({
      yearNumber: data.yearNumber,
      label: data.label.trim(),
      programId: data.programId,
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_ACADEMIC_YEAR_CREATED',
      entity: 'AcademicYear',
      entityId: academicYear.id,
      details: { label: academicYear.label, programId: data.programId },
      req,
    });

    return academicYear;
  }

  async updateAcademicYear(hodUserId, academicYearId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const academicYear = await hodRepository.findAcademicYearById(academicYearId);
    if (!academicYear) throw new NotFoundError(`Academic year '${academicYearId}' not found`);
    if (academicYear.program?.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this academic year');
    }

    const updated = await hodRepository.updateAcademicYear(academicYearId, {
      ...(data.label !== undefined && { label: data.label.trim() }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_ACADEMIC_YEAR_UPDATED',
      entity: 'AcademicYear',
      entityId: academicYearId,
      details: { updatedFields: Object.keys(data) },
      req,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // 4. Sections
  // ─────────────────────────────────────────────────────────

  async listSections(hodUserId, academicYearId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const academicYear = await hodRepository.findAcademicYearById(academicYearId);
    if (!academicYear) throw new NotFoundError(`Academic year '${academicYearId}' not found`);
    if (academicYear.program?.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this academic year');
    }
    return hodRepository.findSectionsByAcademicYear(academicYearId);
  }

  async getSectionById(hodUserId, sectionId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const section = await hodRepository.findSectionById(sectionId);
    if (!section) throw new NotFoundError(`Section '${sectionId}' not found`);
    if (section.academicYear?.program?.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this section');
    }
    return section;
  }

  async createSection(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // Verify academic year → program → department ownership chain
    const academicYear = await hodRepository.findAcademicYearById(data.academicYearId);
    if (!academicYear) throw new NotFoundError(`Academic year '${data.academicYearId}' not found`);
    if (academicYear.program?.departmentId !== departmentId) {
      throw new ForbiddenError('This academic year does not belong to your department');
    }

    // Duplicate section name within same academic year
    const existingSection = await hodRepository.findSectionByAcademicYearAndName(
      data.academicYearId,
      data.name
    );
    if (existingSection) {
      throw new ConflictError(
        `Section '${data.name.toUpperCase()}' already exists in this academic year`
      );
    }

    const section = await hodRepository.createSection({
      name: data.name,
      capacity: data.capacity || null,
      academicYearId: data.academicYearId,
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_SECTION_CREATED',
      entity: 'Section',
      entityId: section.id,
      details: { sectionName: section.name, academicYearId: data.academicYearId },
      req,
    });

    return section;
  }

  async updateSection(hodUserId, sectionId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const section = await hodRepository.findSectionById(sectionId);
    if (!section) throw new NotFoundError(`Section '${sectionId}' not found`);
    if (section.academicYear?.program?.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this section');
    }

    // If name is changing, check for duplicate
    if (data.name) {
      const existingSection = await hodRepository.findSectionByAcademicYearAndName(
        section.academicYearId,
        data.name
      );
      if (existingSection && existingSection.id !== sectionId) {
        throw new ConflictError(
          `Section '${data.name.toUpperCase()}' already exists in this academic year`
        );
      }
    }

    const updated = await hodRepository.updateSection(sectionId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_SECTION_UPDATED',
      entity: 'Section',
      entityId: sectionId,
      details: { updatedFields: Object.keys(data) },
      req,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // 5. Subjects
  // ─────────────────────────────────────────────────────────

  async listSubjects(hodUserId, { programId, isActive } = {}) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // If programId provided, verify it belongs to HOD's department
    if (programId) {
      const program = await hodRepository.findProgramById(programId);
      if (!program) throw new NotFoundError(`Program '${programId}' not found`);
      if (program.departmentId !== departmentId) {
        throw new ForbiddenError('This program does not belong to your department');
      }
    }

    return hodRepository.findSubjectsByDepartment(departmentId, { programId, isActive });
  }

  async getSubjectById(hodUserId, subjectId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const subject = await hodRepository.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError(`Subject '${subjectId}' not found`);
    if (subject.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this subject');
    }
    return subject;
  }

  async createSubject(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // Verify program belongs to HOD's department
    const program = await hodRepository.findProgramById(data.programId);
    if (!program) throw new NotFoundError(`Program '${data.programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('This program does not belong to your department');
    }

    // Subject code must be globally unique (schema constraint)
    const existingCode = await hodRepository.findSubjectByCode(data.code);
    if (existingCode) {
      throw new ConflictError(`Subject code '${data.code.toUpperCase()}' already exists`);
    }

    const subject = await hodRepository.createSubject({
      name: data.name.trim(),
      code: data.code.trim(),
      credits: data.credits || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      departmentId,
      programId: data.programId,
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_SUBJECT_CREATED',
      entity: 'Subject',
      entityId: subject.id,
      details: { subjectName: subject.name, departmentId, programId: data.programId },
      req,
    });

    return subject;
  }

  async updateSubject(hodUserId, subjectId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const subject = await hodRepository.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError(`Subject '${subjectId}' not found`);
    if (subject.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this subject');
    }

    // If code is changing, verify global uniqueness
    if (data.code && data.code.toUpperCase() !== subject.code) {
      const existingCode = await hodRepository.findSubjectByCode(data.code);
      if (existingCode) {
        throw new ConflictError(`Subject code '${data.code.toUpperCase()}' already exists`);
      }
    }

    const updated = await hodRepository.updateSubject(subjectId, {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.code !== undefined && { code: data.code.trim() }),
      ...(data.credits !== undefined && { credits: data.credits }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_SUBJECT_UPDATED',
      entity: 'Subject',
      entityId: subjectId,
      details: { updatedFields: Object.keys(data) },
      req,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // 6. Teachers
  // ─────────────────────────────────────────────────────────

  async listTeachers(hodUserId, { page = 1, limit = 10, search, isActive } = {}) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const { teachers, totalCount } = await hodRepository.findTeachersByDepartment(departmentId, {
      page,
      limit,
      search,
      isActive,
    });

    return {
      teachers: teachers.map((t) => ({
        id: t.id,
        employeeId: t.employeeId,
        designation: t.designation,
        department: t.department,
        user: t.user,
        assignmentsCount: t._count?.teachingAssignments || 0,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getTeacherById(hodUserId, teacherId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const teacher = await hodRepository.findTeacherById(teacherId);
    if (!teacher) throw new NotFoundError(`Teacher '${teacherId}' not found`);
    if (teacher.departmentId !== departmentId) {
      throw new ForbiddenError('This teacher does not belong to your department');
    }
    return teacher;
  }

  async createTeacher(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // Unique email check
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(`User with email '${data.email}' already exists`);
    }

    // Unique employeeId check
    const existingEmployee = await hodRepository.findTeacherByEmployeeId(data.employeeId);
    if (existingEmployee) {
      throw new ConflictError(`Teacher with employee ID '${data.employeeId}' already exists`);
    }

    const initialPlainPassword = data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(initialPlainPassword);

    const teacher = await hodRepository.createTeacherWithUser({
      userData: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash,
        phoneNumber: data.phoneNumber || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : true,
      },
      teacherData: {
        employeeId: data.employeeId.trim(),
        designation: data.designation || null,
        departmentId,
      },
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_TEACHER_CREATED',
      entity: 'Teacher',
      entityId: teacher.id,
      details: {
        teacherEmail: teacher.user.email,
        employeeId: teacher.employeeId,
        departmentId,
      },
      req,
    });

    return {
      teacher,
      ...(data.password ? {} : { temporaryPassword: initialPlainPassword }),
      message: 'Teacher created successfully',
    };
  }

  async updateTeacherStatus(hodUserId, teacherId, isActive, reason, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const teacher = await hodRepository.findTeacherById(teacherId);
    if (!teacher) throw new NotFoundError(`Teacher '${teacherId}' not found`);
    if (teacher.departmentId !== departmentId) {
      throw new ForbiddenError('This teacher does not belong to your department');
    }

    const updated = await hodRepository.updateTeacherStatus(teacher.userId, isActive);

    // Revoke sessions if deactivating
    if (!isActive) {
      await refreshTokenRepository.revokeAllUserTokens(teacher.userId);
    }

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_TEACHER_STATUS_CHANGED',
      entity: 'Teacher',
      entityId: teacherId,
      details: {
        previousStatus: teacher.user.isActive,
        newStatus: isActive,
        reason: reason || 'Status updated by HOD',
      },
      req,
    });

    return {
      userId: updated.id,
      isActive: updated.isActive,
      teacher: updated.teacher,
      message: `Teacher status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
    };
  }

  async resetTeacherPassword(hodUserId, teacherId, temporaryPassword, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const teacher = await hodRepository.findTeacherById(teacherId);
    if (!teacher) throw new NotFoundError(`Teacher '${teacherId}' not found`);
    if (teacher.departmentId !== departmentId) {
      throw new ForbiddenError('This teacher does not belong to your department');
    }

    const tempPassword = temporaryPassword || generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    await userRepository.updatePasswordWithFlag(teacher.userId, passwordHash, true);
    await refreshTokenRepository.revokeAllUserTokens(teacher.userId);

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_TEACHER_PASSWORD_RESET',
      entity: 'Teacher',
      entityId: teacherId,
      details: { teacherEmail: teacher.user.email },
      req,
    });

    return {
      message: 'Teacher password reset successfully. Teacher must change password on next login.',
      temporaryPassword: tempPassword,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 7. Teaching Assignments
  // ─────────────────────────────────────────────────────────

  async listAssignments(hodUserId, filters = {}) {
    const departmentId = await resolveHodDepartment(hodUserId);
    return hodRepository.findAssignmentsByDepartment(departmentId, filters);
  }

  async getAssignmentById(hodUserId, assignmentId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const assignment = await hodRepository.findAssignmentById(assignmentId);
    if (!assignment) throw new NotFoundError(`Teaching assignment '${assignmentId}' not found`);
    if (assignment.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this assignment');
    }
    return assignment;
  }

  async createTeachingAssignment(hodUserId, data, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const { teacherId, subjectId, programId, academicYearId, sectionId, validFrom, validTo } = data;

    // 1. Teacher belongs to HOD's department
    const teacher = await hodRepository.findTeacherById(teacherId);
    if (!teacher) throw new NotFoundError(`Teacher '${teacherId}' not found`);
    if (teacher.departmentId !== departmentId) {
      throw new ForbiddenError('Teacher does not belong to your department');
    }
    if (!teacher.user.isActive) {
      throw new BadRequestError('Teacher is inactive. Activate the teacher before assigning');
    }

    // 2. Subject belongs to HOD's department
    const subject = await hodRepository.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError(`Subject '${subjectId}' not found`);
    if (subject.departmentId !== departmentId) {
      throw new ForbiddenError('Subject does not belong to your department');
    }
    if (!subject.isActive) {
      throw new BadRequestError('Subject is inactive. Activate the subject before assigning');
    }

    // 3. Program belongs to HOD's department
    const program = await hodRepository.findProgramById(programId);
    if (!program) throw new NotFoundError(`Program '${programId}' not found`);
    if (program.departmentId !== departmentId) {
      throw new ForbiddenError('Program does not belong to your department');
    }
    if (!program.isActive) {
      throw new BadRequestError('Program is inactive');
    }

    // 4. Academic year belongs to program
    const academicYear = await hodRepository.findAcademicYearById(academicYearId);
    if (!academicYear) throw new NotFoundError(`Academic year '${academicYearId}' not found`);
    if (academicYear.programId !== programId) {
      throw new BadRequestError('Academic year does not belong to the specified program');
    }

    // 5. Section belongs to academic year
    const section = await hodRepository.findSectionById(sectionId);
    if (!section) throw new NotFoundError(`Section '${sectionId}' not found`);
    if (section.academicYearId !== academicYearId) {
      throw new BadRequestError('Section does not belong to the specified academic year');
    }

    // 6. Duplicate assignment check
    const duplicate = await hodRepository.findDuplicateAssignment({
      teacherId,
      subjectId,
      sectionId,
      academicYearId,
    });
    if (duplicate) {
      throw new ConflictError(
        'A teaching assignment already exists for this teacher, subject, section, and academic year'
      );
    }

    const assignment = await hodRepository.createTeachingAssignment({
      teacherId,
      subjectId,
      departmentId,
      programId,
      academicYearId,
      sectionId,
      status: 'ACTIVE',
      ...(validFrom && { startDate: new Date(validFrom) }),
      ...(validTo && { endDate: new Date(validTo) }),
    });

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_TEACHING_ASSIGNMENT_CREATED',
      entity: 'TeachingAssignment',
      entityId: assignment.id,
      details: { teacherId, subjectId, programId, academicYearId, sectionId, departmentId },
      req,
    });

    return assignment;
  }

  async updateAssignmentStatus(hodUserId, assignmentId, status, req) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const assignment = await hodRepository.findAssignmentById(assignmentId);
    if (!assignment) throw new NotFoundError(`Teaching assignment '${assignmentId}' not found`);
    if (assignment.departmentId !== departmentId) {
      throw new ForbiddenError('You do not have access to this assignment');
    }

    const updated = await hodRepository.updateAssignmentStatus(assignmentId, status);

    await auditService.log({
      userId: hodUserId,
      action: 'HOD_TEACHING_ASSIGNMENT_STATUS_CHANGED',
      entity: 'TeachingAssignment',
      entityId: assignmentId,
      details: { status, departmentId },
      req,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // 8. Students
  // ─────────────────────────────────────────────────────────

  async listStudents(hodUserId, { page = 1, limit = 10, search, programId, sectionId } = {}) {
    const departmentId = await resolveHodDepartment(hodUserId);

    // If programId provided, verify it belongs to HOD's department
    if (programId) {
      const program = await hodRepository.findProgramById(programId);
      if (!program) throw new NotFoundError(`Program '${programId}' not found`);
      if (program.departmentId !== departmentId) {
        throw new ForbiddenError('This program does not belong to your department');
      }
    }

    // If sectionId provided, verify it is within HOD's department scope
    if (sectionId) {
      const section = await hodRepository.findSectionById(sectionId);
      if (!section) throw new NotFoundError(`Section '${sectionId}' not found`);
      if (section.academicYear?.program?.departmentId !== departmentId) {
        throw new ForbiddenError('This section does not belong to your department');
      }
    }

    const { students, totalCount } = await hodRepository.findStudentsByDepartment(departmentId, {
      page,
      limit,
      search,
      programId,
      sectionId,
    });

    return {
      students,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getStudentById(hodUserId, studentId) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const student = await hodRepository.findStudentById(studentId);
    if (!student) throw new NotFoundError(`Student '${studentId}' not found`);
    if (student.departmentId !== departmentId) {
      throw new ForbiddenError('This student does not belong to your department');
    }
    return student;
  }

  // ─────────────────────────────────────────────────────────
  // 9. Attendance
  // ─────────────────────────────────────────────────────────

  async getDepartmentAttendanceSummary(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    // Always inject departmentId — HOD cannot supply a different one
    return attendanceRepository.getOverallSummary({ ...filters, departmentId });
  }

  async getProgramAttendance(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    return attendanceRepository.getProgramWiseAttendance({ ...filters, departmentId });
  }

  async getAcademicYearAttendance(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    // Validate programId scope if provided
    if (filters.programId) {
      const program = await hodRepository.findProgramById(filters.programId);
      if (!program || program.departmentId !== departmentId) {
        throw new ForbiddenError('Program does not belong to your department');
      }
    }
    return attendanceRepository.getAcademicYearWiseAttendance({ ...filters, departmentId });
  }

  async getSectionAttendance(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    return attendanceRepository.getSectionWiseAttendance({ ...filters, departmentId });
  }

  async getSubjectAttendance(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    return attendanceRepository.getSubjectWiseAttendance({ ...filters, departmentId });
  }

  async getStudentAttendance(hodUserId, studentId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    // Verify student belongs to HOD's department
    const student = await hodRepository.findStudentById(studentId);
    if (!student) throw new NotFoundError(`Student '${studentId}' not found`);
    if (student.departmentId !== departmentId) {
      throw new ForbiddenError('This student does not belong to your department');
    }

    return hodRepository.findStudentAttendance(studentId, departmentId, filters);
  }

  async getLowAttendance(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const { type, ...restFilters } = filters;

    const scopedFilters = { ...restFilters, departmentId };

    if (type === 'subjects') return attendanceRepository.getLowAttendanceSubjects(scopedFilters);
    if (type === 'students') return attendanceRepository.getLowAttendanceStudents(scopedFilters);

    const [studentsReport, subjectsReport] = await Promise.all([
      attendanceRepository.getLowAttendanceStudents(scopedFilters),
      attendanceRepository.getLowAttendanceSubjects(scopedFilters),
    ]);
    return {
      threshold: studentsReport.threshold,
      students: studentsReport.students,
      subjects: subjectsReport.subjects,
      studentPagination: studentsReport.pagination,
      subjectPagination: subjectsReport.pagination,
    };
  }

  async getReportsSummary(hodUserId, filters) {
    const departmentId = await resolveHodDepartment(hodUserId);
    const scopedFilters = { ...filters, departmentId };

    const [summary, programs, lowAttendance] = await Promise.all([
      attendanceRepository.getOverallSummary(scopedFilters),
      attendanceRepository.getProgramWiseAttendance(scopedFilters),
      attendanceRepository.getLowAttendanceStudents({ ...scopedFilters, limit: 10 }),
    ]);

    return {
      department: { id: departmentId },
      summary,
      programBreakdown: programs,
      criticalLowAttendanceStudents: lowAttendance.students,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default new HodService();
