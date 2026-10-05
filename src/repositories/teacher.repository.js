import { prisma } from '../lib/prisma.js';

class TeacherRepository {
  /**
   * Find teacher record by authenticated User ID with full user & department details
   */
  async findTeacherByUserId(userId) {
    return prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatarUrl: true,
            isActive: true,
            mustChangePassword: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * Find teacher by Teacher ID
   */
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
            avatarUrl: true,
            isActive: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * Update teacher profile (user attributes + designation)
   */
  async updateTeacherProfile(userId, { firstName, lastName, phoneNumber, avatarUrl, designation }) {
    return prisma.$transaction(async (tx) => {
      const userUpdateData = {};
      if (firstName !== undefined) userUpdateData.firstName = firstName;
      if (lastName !== undefined) userUpdateData.lastName = lastName;
      if (phoneNumber !== undefined) userUpdateData.phoneNumber = phoneNumber;
      if (avatarUrl !== undefined) userUpdateData.avatarUrl = avatarUrl;

      let updatedUser = null;
      if (Object.keys(userUpdateData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      if (designation !== undefined) {
        await tx.teacher.update({
          where: { userId },
          data: { designation },
        });
      }

      return tx.teacher.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              avatarUrl: true,
              isActive: true,
              mustChangePassword: true,
              lastLoginAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    });
  }

  // ============================================================
  // TEACHING ASSIGNMENTS
  // ============================================================

  /**
   * Find assignments belonging strictly to the specified teacher
   */
  async findAssignmentsByTeacher(teacherId, filters = {}) {
    const { programId, academicYearId, sectionId, subjectId, status } = filters;
    return prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        ...(programId && { programId }),
        ...(academicYearId && { academicYearId }),
        ...(sectionId && { sectionId }),
        ...(subjectId && { subjectId }),
        ...(status && { status }),
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            durationYears: true,
            isActive: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            yearNumber: true,
            label: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            isActive: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { program: { name: 'asc' } },
        { academicYear: { yearNumber: 'asc' } },
        { section: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });
  }

  /**
   * Find assignment by ID with full hierarchy & teacher verification
   */
  async findAssignmentById(assignmentId) {
    return prisma.teachingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            isActive: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            durationYears: true,
            isActive: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            yearNumber: true,
            label: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * Find assigned distinct programs for a teacher
   */
  async findProgramsByTeacher(teacherId) {
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
      },
      select: {
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            durationYears: true,
            isActive: true,
          },
        },
      },
      distinct: ['programId'],
    });

    return assignments.map((a) => a.program).filter(Boolean);
  }

  /**
   * Find assigned academic years for a teacher (optionally filtered by program)
   */
  async findAcademicYearsByTeacher(teacherId, programId = null) {
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
        ...(programId && { programId }),
      },
      select: {
        academicYear: {
          select: {
            id: true,
            yearNumber: true,
            label: true,
            programId: true,
          },
        },
      },
      distinct: ['academicYearId'],
    });

    return assignments.map((a) => a.academicYear).filter(Boolean);
  }

  /**
   * Find assigned sections for a teacher (optionally filtered by academic year)
   */
  async findSectionsByTeacher(teacherId, academicYearId = null) {
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
        ...(academicYearId && { academicYearId }),
      },
      select: {
        section: {
          select: {
            id: true,
            name: true,
            capacity: true,
            academicYearId: true,
          },
        },
      },
      distinct: ['sectionId'],
    });

    return assignments.map((a) => a.section).filter(Boolean);
  }

  /**
   * Find assigned subjects for a teacher
   */
  async findSubjectsByTeacher(teacherId, filters = {}) {
    const { programId, academicYearId, sectionId } = filters;
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
        ...(programId && { programId }),
        ...(academicYearId && { academicYearId }),
        ...(sectionId && { sectionId }),
      },
      select: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            isActive: true,
            programId: true,
            departmentId: true,
          },
        },
      },
      distinct: ['subjectId'],
    });

    return assignments.map((a) => a.subject).filter(Boolean);
  }

  // ============================================================
  // ATTENDANCE SESSIONS
  // ============================================================

  /**
   * Create an Attendance Session record in PostgreSQL
   */
  async createAttendanceSession(data) {
    return prisma.attendanceSession.create({
      data,
      include: {
        teachingAssignment: {
          select: {
            id: true,
            status: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            label: true,
            yearNumber: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
    });
  }

  /**
   * Find session by ID with complete relations and stats
   */
  async findSessionById(sessionId) {
    return prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        teachingAssignment: {
          include: {
            program: { select: { id: true, name: true, code: true } },
            academicYear: { select: { id: true, label: true, yearNumber: true } },
            section: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        department: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
    });
  }

  /**
   * Find active sessions for a teacher (status = ACTIVE)
   */
  async findActiveSessionsByTeacher(teacherId) {
    return prisma.attendanceSession.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        program: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, label: true, yearNumber: true } },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * List sessions for a teacher with pagination and filters
   */
  async findSessionsByTeacher(teacherId, {
    page = 1,
    limit = 20,
    status,
    assignmentId,
    subjectId,
    sectionId,
    startDate,
    endDate,
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      teacherId,
      ...(status && { status }),
      ...(assignmentId && { teachingAssignmentId: assignmentId }),
      ...(subjectId && { subjectId }),
      ...(sectionId && { sectionId }),
      ...(startDate && { sessionDate: { gte: new Date(startDate) } }),
      ...(endDate && { sessionDate: { lte: new Date(endDate) } }),
    };

    const [sessions, totalCount] = await Promise.all([
      prisma.attendanceSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          subject: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          program: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, label: true, yearNumber: true } },
          _count: {
            select: {
              attendanceRecords: true,
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
      }),
      prisma.attendanceSession.count({ where }),
    ]);

    return { sessions, totalCount };
  }

  /**
   * Update session status and timestamps (e.g. closing session)
   */
  async updateSessionStatus(sessionId, status, updateData = {}) {
    return prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status,
        ...updateData,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
    });
  }

  // ============================================================
  // ATTENDANCE RECORDS FOR SESSIONS
  // ============================================================

  /**
   * Get attendance records for a specific session with student details
   */
  async findSessionAttendanceRecords(sessionId, { page = 1, limit = 50, status, search } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      sessionId,
      ...(status && { status }),
      ...(search && {
        student: {
          OR: [
            { rollNumber: { contains: search, mode: 'insensitive' } },
            { enrollmentNumber: { contains: search, mode: 'insensitive' } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        },
      }),
    };

    const [records, totalCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { student: { rollNumber: 'asc' } },
        ],
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records, totalCount };
  }

  /**
   * Aggregate actual database attendance stats for a session
   */
  async getSessionAttendanceSummary(sessionId, sectionId) {
    // 1. Count total students in section
    const totalStudents = await prisma.student.count({
      where: {
        sectionId,
        user: { isActive: true },
      },
    });

    // 2. Count actual records by status
    const recordsGrouped = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { sessionId },
      _count: { _all: true },
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let totalMarked = 0;

    recordsGrouped.forEach((group) => {
      const count = group._count._all;
      totalMarked += count;
      if (group.status === 'PRESENT') presentCount = count;
      else if (group.status === 'ABSENT') absentCount = count;
      else if (group.status === 'LATE') lateCount = count;
      else if (group.status === 'EXCUSED') excusedCount = count;
    });

    const attendancePercentage = totalStudents > 0
      ? Number(((presentCount / totalStudents) * 100).toFixed(2))
      : (totalMarked > 0 ? Number(((presentCount / totalMarked) * 100).toFixed(2)) : 0);

    return {
      totalStudents,
      totalMarked,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage,
    };
  }
}

export default new TeacherRepository();
