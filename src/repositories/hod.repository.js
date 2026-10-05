import { prisma } from '../lib/prisma.js';

class HodRepository {
  // ============================================================
  // DEPARTMENT (read-only for HOD)
  // ============================================================

  async findDepartmentById(departmentId) {
    return prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        hod: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: { programs: true, teachers: true, students: true, subjects: true },
        },
      },
    });
  }

  // ============================================================
  // PROGRAMS
  // ============================================================

  async findProgramsByDepartment(departmentId, { isActive } = {}) {
    return prisma.program.findMany({
      where: {
        departmentId,
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        academicYears: {
          include: { sections: true },
          orderBy: { yearNumber: 'asc' },
        },
        _count: { select: { students: true, subjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findProgramById(programId) {
    return prisma.program.findUnique({
      where: { id: programId },
      include: {
        department: true,
        academicYears: {
          include: { sections: true },
          orderBy: { yearNumber: 'asc' },
        },
        _count: { select: { students: true, subjects: true } },
      },
    });
  }

  async findProgramByCode(departmentId, code) {
    return prisma.program.findUnique({
      where: { departmentId_code: { departmentId, code: code.toUpperCase() } },
    });
  }

  async createProgram(data) {
    return prisma.program.create({
      data: { ...data, code: data.code.toUpperCase() },
      include: { department: { select: { id: true, name: true, code: true } } },
    });
  }

  async updateProgram(programId, data) {
    return prisma.program.update({
      where: { id: programId },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
      include: { department: { select: { id: true, name: true, code: true } } },
    });
  }

  // ============================================================
  // ACADEMIC YEARS
  // ============================================================

  async findAcademicYearsByProgram(programId) {
    return prisma.academicYear.findMany({
      where: { programId },
      include: {
        sections: true,
        _count: { select: { students: true, teachingAssignments: true } },
      },
      orderBy: { yearNumber: 'asc' },
    });
  }

  async findAcademicYearById(academicYearId) {
    return prisma.academicYear.findUnique({
      where: { id: academicYearId },
      include: {
        program: { include: { department: true } },
        sections: true,
        _count: { select: { students: true, teachingAssignments: true } },
      },
    });
  }

  async findAcademicYearByProgramAndNumber(programId, yearNumber) {
    return prisma.academicYear.findUnique({
      where: { programId_yearNumber: { programId, yearNumber } },
    });
  }

  async createAcademicYear(data) {
    return prisma.academicYear.create({
      data,
      include: {
        program: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateAcademicYear(academicYearId, data) {
    return prisma.academicYear.update({
      where: { id: academicYearId },
      data,
      include: {
        program: { select: { id: true, name: true, code: true } },
        sections: true,
      },
    });
  }

  // ============================================================
  // SECTIONS
  // ============================================================

  async findSectionsByAcademicYear(academicYearId) {
    return prisma.section.findMany({
      where: { academicYearId },
      include: {
        _count: { select: { students: true, teachingAssignments: true, attendanceSessions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findSectionById(sectionId) {
    return prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        academicYear: {
          include: { program: { include: { department: true } } },
        },
        _count: { select: { students: true, teachingAssignments: true } },
      },
    });
  }

  async findSectionByAcademicYearAndName(academicYearId, name) {
    return prisma.section.findUnique({
      where: { academicYearId_name: { academicYearId, name: name.toUpperCase().trim() } },
    });
  }

  async createSection(data) {
    return prisma.section.create({
      data: { ...data, name: data.name.toUpperCase().trim() },
      include: {
        academicYear: { select: { id: true, label: true, yearNumber: true } },
      },
    });
  }

  async updateSection(sectionId, data) {
    return prisma.section.update({
      where: { id: sectionId },
      data: {
        ...data,
        ...(data.name && { name: data.name.toUpperCase().trim() }),
      },
      include: {
        academicYear: { select: { id: true, label: true, yearNumber: true } },
      },
    });
  }

  // ============================================================
  // SUBJECTS
  // ============================================================

  async findSubjectsByDepartment(departmentId, { programId, isActive } = {}) {
    return prisma.subject.findMany({
      where: {
        departmentId,
        ...(programId && { programId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findSubjectById(subjectId) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        department: true,
        program: true,
      },
    });
  }

  async findSubjectByCode(code) {
    return prisma.subject.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  async createSubject(data) {
    return prisma.subject.create({
      data: { ...data, code: data.code.toUpperCase() },
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateSubject(subjectId, data) {
    return prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ============================================================
  // TEACHERS
  // ============================================================

  async findTeachersByDepartment(departmentId, { page = 1, limit = 10, search, isActive } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      departmentId,
      ...(isActive !== undefined && {
        user: { isActive },
      }),
      ...(search && {
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [teachers, totalCount] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              isActive: true,
              mustChangePassword: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { teachingAssignments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    return { teachers, totalCount };
  }

  async findTeacherById(teacherId) {
    return prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
            mustChangePassword: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        department: { select: { id: true, name: true, code: true } },
        teachingAssignments: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            program: { select: { id: true, name: true, code: true } },
            academicYear: { select: { id: true, label: true, yearNumber: true } },
            section: { select: { id: true, name: true } },
          },
          where: { status: 'ACTIVE' },
        },
        _count: { select: { teachingAssignments: true } },
      },
    });
  }

  async findTeacherByEmployeeId(employeeId) {
    return prisma.teacher.findUnique({
      where: { employeeId },
    });
  }

  /**
   * Create teacher + user atomically.
   */
  async createTeacherWithUser({ userData, teacherData }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          role: 'TEACHER',
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          ...teacherData,
          userId: user.id,
        },
      });

      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              isActive: true,
              mustChangePassword: true,
              createdAt: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
        },
      });
    });
  }

  async updateTeacherStatus(userId, isActive) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: {
        teacher: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }

  // ============================================================
  // TEACHING ASSIGNMENTS
  // ============================================================

  async findAssignmentsByDepartment(departmentId, filters = {}) {
    const { teacherId, subjectId, programId, academicYearId, sectionId, status } = filters;
    return prisma.teachingAssignment.findMany({
      where: {
        departmentId,
        ...(teacherId && { teacherId }),
        ...(subjectId && { subjectId }),
        ...(programId && { programId }),
        ...(academicYearId && { academicYearId }),
        ...(sectionId && { sectionId }),
        ...(status && { status }),
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAssignmentById(assignmentId) {
    return prisma.teachingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            department: { select: { id: true, name: true, code: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        section: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Check for duplicate assignment (same teacher+subject+section+academicYear)
   */
  async findDuplicateAssignment({ teacherId, subjectId, sectionId, academicYearId }) {
    return prisma.teachingAssignment.findUnique({
      where: {
        teacherId_subjectId_sectionId_academicYearId: {
          teacherId,
          subjectId,
          sectionId,
          academicYearId,
        },
      },
    });
  }

  async createTeachingAssignment(data) {
    return prisma.teachingAssignment.create({
      data,
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        section: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateAssignmentStatus(assignmentId, status) {
    return prisma.teachingAssignment.update({
      where: { id: assignmentId },
      data: { status },
      include: {
        teacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });
  }

  // ============================================================
  // STUDENTS (via enrollment — never trust departmentId from client)
  // ============================================================

  async findStudentsByDepartment(departmentId, { page = 1, limit = 10, search, programId, sectionId } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      departmentId,
      ...(programId && { programId }),
      ...(sectionId && { sectionId }),
      ...(search && {
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { rollNumber: { contains: search, mode: 'insensitive' } },
          { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              isActive: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, label: true, yearNumber: true } },
          section: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    return { students, totalCount };
  }

  async findStudentById(studentId) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            isActive: true,
            createdAt: true,
          },
        },
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        section: { select: { id: true, name: true } },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  // ============================================================
  // ATTENDANCE (scoped to department)
  // ============================================================

  /**
   * Department-scoped student attendance history for a single student.
   * Verifies the student belongs to departmentId before returning records.
   */
  async findStudentAttendance(studentId, departmentId, { page = 1, limit = 20, startDate, endDate } = {}) {
    const skip = (page - 1) * limit;

    const [records, totalCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          studentId,
          student: { departmentId },
          ...(startDate || endDate
            ? {
                session: {
                  ...(startDate && { sessionDate: { gte: new Date(startDate) } }),
                  ...(endDate && { sessionDate: { lte: new Date(endDate) } }),
                },
              }
            : {}),
        },
        skip,
        take: limit,
        include: {
          session: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              section: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceRecord.count({
        where: {
          studentId,
          student: { departmentId },
        },
      }),
    ]);

    return { records, totalCount };
  }
}

export default new HodRepository();
