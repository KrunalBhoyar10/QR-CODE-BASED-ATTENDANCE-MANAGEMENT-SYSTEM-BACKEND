import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../utils/passwords.js';
import auditService from './audit.service.js';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors.js';

/**
 * Registration Service — public student self-registration.
 *
 * Only uses the shared Prisma client directly (no extra repositories needed
 * beyond what this module accesses) to keep the transaction atomic.
 */
class RegistrationService {
  // ─── Public dropdown data (no auth) ──────────────────────────────────────

  /** All active programs across all departments */
  async getPrograms() {
    return prisma.program.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        durationYears: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Academic years for a given program */
  async getAcademicYearsByProgram(programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId, isActive: true },
    });
    if (!program) throw new NotFoundError('Program not found');

    return prisma.academicYear.findMany({
      where: { programId },
      select: {
        id: true,
        yearNumber: true,
        label: true,
        semesterCount: true,
        programId: true,
      },
      orderBy: { yearNumber: 'asc' },
    });
  }

  /** Sections for a given academic year */
  async getSectionsByAcademicYear(academicYearId) {
    const year = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!year) throw new NotFoundError('Academic year not found');

    return prisma.section.findMany({
      where: { academicYearId },
      select: { id: true, name: true, capacity: true, academicYearId: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Subjects for a given section.
   * Returns all active subjects for the section's program AND academic year.
   * Includes the subjectType field so the frontend can separate Common (compulsory)
   * from Elective (student choice) subjects.
   */
  async getSubjectsBySection(sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        academicYear: {
          include: { program: true },
        },
      },
    });
    if (!section) throw new NotFoundError('Section not found');

    const programId = section.academicYear.programId;
    const academicYearId = section.academicYearId;

    return prisma.subject.findMany({
      where: {
        programId,
        isActive: true,
        // Show subjects assigned to this academic year, plus unassigned (null)
        // legacy subjects so they remain visible until assigned.
        OR: [
          { academicYearId },
          { academicYearId: null },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        credits: true,
        programId: true,
        departmentId: true,
        academicYearId: true,
        subjectType: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Student self-registration ────────────────────────────────────────────

  /**
   * Register a new student account.
   *
   * Validates all academic references, checks uniqueness of email and USN,
   * hashes the password, then creates User + Student + StudentEnrollment
   * inside a single Prisma transaction.
   *
   * @param {object} params
   * @param {string} params.fullName
   * @param {string} params.email         Already lowercased and domain-validated by Zod
   * @param {string} params.usn           USN / university student number (→ enrollmentNumber)
   * @param {string} params.programId
   * @param {string} params.academicYearId
   * @param {string} params.sectionId
   * @param {string[]} params.subjectIds  Subjects to enrol in (ignored for now — placeholder)
   * @param {string} params.password
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   */
  async registerStudent({
    fullName,
    email,
    usn,
    programId,
    academicYearId,
    sectionId,
    subjectIds,
    password,
    ipAddress,
    userAgent,
  }) {
    // ── 1. Check email uniqueness ────────────────────────────────────────
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictError(
        'An account with this email address already exists. Please sign in instead.'
      );
    }

    // ── 2. Check USN uniqueness ──────────────────────────────────────────
    const existingUsn = await prisma.student.findUnique({
      where: { enrollmentNumber: usn.toUpperCase() },
    });
    if (existingUsn) {
      throw new ConflictError(
        'A student with this USN is already registered. Contact your administrator if this is incorrect.'
      );
    }

    // ── 3. Validate academic references ──────────────────────────────────
    const program = await prisma.program.findUnique({
      where: { id: programId, isActive: true },
      include: { department: true },
    });
    if (!program) throw new NotFoundError('The selected program was not found or is inactive.');

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!academicYear || academicYear.programId !== programId) {
      throw new BadRequestError(
        'The selected academic year does not belong to the chosen program.'
      );
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.academicYearId !== academicYearId) {
      throw new BadRequestError(
        'The selected section does not belong to the chosen academic year.'
      );
    }

    // ── 4. Validate subjects (must belong to the program and academic year) ─
    if (subjectIds && subjectIds.length > 0) {
      const foundSubjects = await prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          programId,
          isActive: true,
          OR: [
            { academicYearId },
            { academicYearId: null },
          ],
        },
        select: { id: true },
      });
      if (foundSubjects.length !== subjectIds.length) {
        throw new BadRequestError(
          'One or more selected subjects are invalid or do not belong to the chosen program/year.'
        );
      }
    }

    // ── 5. Parse name ─────────────────────────────────────────────────────
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // ── 6. Hash password ──────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    // ── 7. Determine academic session string (e.g. "2026-2027") ──────────
    const currentYear = new Date().getFullYear();
    const academicSession = `${currentYear}-${currentYear + 1}`;

    // ── 8. Create User + Student + StudentEnrollment in one transaction ───
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          role: 'STUDENT',
          isActive: true,
          mustChangePassword: false,
        },
      });

      // Generate a sequential-like roll number: dept code + year + section + random suffix
      const rollNumber = `${program.department.code}${academicYear.yearNumber}${section.name}${Date.now().toString().slice(-4)}`;

      // Create Student profile
      const student = await tx.student.create({
        data: {
          rollNumber,
          enrollmentNumber: usn.toUpperCase(),
          userId: user.id,
          departmentId: program.departmentId,
          programId,
          academicYearId,
          sectionId,
        },
      });

      // Create StudentEnrollment
      await tx.studentEnrollment.create({
        data: {
          studentId: student.id,
          academicYearId,
          sectionId,
          academicSession,
          status: 'ACTIVE',
        },
      });

      return { user, student };
    });

    // ── 9. Audit log ──────────────────────────────────────────────────────
    await auditService.log({
      userId: result.user.id,
      action: 'STUDENT_REGISTERED',
      entity: 'Student',
      entityId: result.student.id,
      details: {
        email: result.user.email,
        usn,
        programId,
        academicYearId,
        sectionId,
      },
      req: { ip: ipAddress, headers: { 'user-agent': userAgent } },
    });

    return {
      message:
        'Registration successful. Your account is now active. You can sign in with your institutional email.',
      userId: result.user.id,
      studentId: result.student.id,
    };
  }
}

export default new RegistrationService();
