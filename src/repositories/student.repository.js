import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { DEFAULT_LOW_ATTENDANCE_THRESHOLD } from '../constants/attendance.constants.js';

class StudentRepository {
  /**
   * Find student profile by User ID with complete academic relations & active enrollment
   */
  async findStudentByUserId(userId) {
    return prisma.student.findUnique({
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
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
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
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find student by Student ID
   */
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
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            academicYear: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Update student profile (user fields)
   */
  async updateStudentProfile(userId, { firstName, lastName, phoneNumber, avatarUrl }) {
    const userUpdateData = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (phoneNumber !== undefined) userUpdateData.phoneNumber = phoneNumber;
    if (avatarUrl !== undefined) userUpdateData.avatarUrl = avatarUrl;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    return this.findStudentByUserId(userId);
  }

  /**
   * Find all enrollments for a student
   */
  async findEnrollmentsByStudent(studentId) {
    return prisma.studentEnrollment.findMany({
      where: { studentId },
      include: {
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
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /**
   * Find active enrollment for student matching section and academic year
   */
  async findActiveEnrollment(studentId, academicYearId, sectionId) {
    return prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        sectionId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Find attendance session by ID with complete hierarchy context
   */
  async findSessionById(sessionId) {
    return prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        teachingAssignment: {
          include: {
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
            subject: true,
            section: true,
            academicYear: true,
            program: true,
            department: true,
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
        subject: true,
        section: true,
        academicYear: true,
        program: true,
        department: true,
      },
    });
  }

  /**
   * Find single attendance record for a student in a session (duplicate check)
   */
  async findAttendanceRecord(studentId, sessionId) {
    return prisma.attendanceRecord.findUnique({
      where: {
        studentId_sessionId: {
          studentId,
          sessionId,
        },
      },
    });
  }

  /**
   * Create attendance record within a PostgreSQL transaction
   */
  async createAttendanceRecordInTx(tx, data) {
    return tx.attendanceRecord.create({
      data,
      include: {
        session: {
          include: {
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
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Overall Student Attendance Summary Aggregation
   */
  async getStudentAttendanceSummary(studentId, sectionId) {
    // 1. Total sessions conducted for student's section
    const totalSessions = await prisma.attendanceSession.count({
      where: {
        sectionId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    // 2. Attendance records breakdown for this student
    const recordsGrouped = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId },
      _count: { _all: true },
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let totalMarkedRecords = 0;

    recordsGrouped.forEach((group) => {
      const count = group._count._all;
      totalMarkedRecords += count;
      if (group.status === 'PRESENT') presentCount = count;
      else if (group.status === 'ABSENT') absentCount = count;
      else if (group.status === 'LATE') lateCount = count;
      else if (group.status === 'EXCUSED') excusedCount = count;
    });

    // Effective attended sessions count (Present + Late)
    const effectiveAttended = presentCount + lateCount;

    // Derived absent sessions if unrecorded in session
    const effectiveTotal = Math.max(totalSessions, totalMarkedRecords);
    const derivedAbsent = Math.max(0, effectiveTotal - (presentCount + lateCount + excusedCount));

    const attendancePercentage = effectiveTotal > 0
      ? Number(((effectiveAttended / effectiveTotal) * 100).toFixed(2))
      : 0;

    const threshold = DEFAULT_LOW_ATTENDANCE_THRESHOLD;
    const isLowAttendance = attendancePercentage < threshold && effectiveTotal > 0;

    return {
      totalSessions: effectiveTotal,
      totalMarkedRecords,
      presentCount,
      absentCount: absentCount > 0 ? absentCount : derivedAbsent,
      lateCount,
      excusedCount,
      effectiveAttended,
      attendancePercentage,
      lowAttendanceThreshold: threshold,
      isLowAttendance,
    };
  }

  /**
   * Subject-wise Attendance Aggregation for Student
   */
  async getStudentSubjectWiseAttendance(studentId, sectionId, programId) {
    // Query all subjects and sessions for the student's section using raw SQL aggregation for speed & precision
    const query = Prisma.sql`
      SELECT 
        sub.id AS "subjectId",
        sub.name AS "subjectName",
        sub.code AS "subjectCode",
        sub.credits AS "credits",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(DISTINCT ar.id)::int AS "totalRecords",
        COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.id END)::int AS "presentCount",
        COUNT(DISTINCT CASE WHEN ar.status = 'ABSENT' THEN ar.id END)::int AS "absentCount",
        COUNT(DISTINCT CASE WHEN ar.status = 'LATE' THEN ar.id END)::int AS "lateCount",
        COUNT(DISTINCT CASE WHEN ar.status = 'EXCUSED' THEN ar.id END)::int AS "excusedCount",
        CASE 
          WHEN COUNT(DISTINCT s.id) > 0 THEN 
            ROUND(((COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' OR ar.status = 'LATE' THEN ar.id END)::numeric / COUNT(DISTINCT s.id)::numeric) * 100), 2)
          WHEN COUNT(DISTINCT ar.id) > 0 THEN
            ROUND(((COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' OR ar.status = 'LATE' THEN ar.id END)::numeric / COUNT(DISTINCT ar.id)::numeric) * 100), 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM subjects sub
      LEFT JOIN attendance_sessions s ON s."subjectId" = sub.id AND s."sectionId" = ${sectionId} AND s.status IN ('ACTIVE', 'COMPLETED')
      LEFT JOIN attendance_records ar ON ar."sessionId" = s.id AND ar."studentId" = ${studentId}
      WHERE sub."programId" = ${programId} AND sub."isActive" = true
      GROUP BY sub.id, sub.name, sub.code, sub.credits
      ORDER BY sub.name ASC;
    `;

    const results = await prisma.$queryRaw(query);
    const threshold = DEFAULT_LOW_ATTENDANCE_THRESHOLD;

    return results.map((row) => {
      const totalSessions = Number(row.totalSessions || 0);
      const totalRecords = Number(row.totalRecords || 0);
      const presentCount = Number(row.presentCount || 0);
      const absentCount = Number(row.absentCount || 0);
      const lateCount = Number(row.lateCount || 0);
      const excusedCount = Number(row.excusedCount || 0);
      const attendancePercentage = Number(row.attendancePercentage || 0);
      const effectiveTotal = Math.max(totalSessions, totalRecords);
      const derivedAbsent = Math.max(0, effectiveTotal - (presentCount + lateCount + excusedCount));

      return {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        credits: row.credits,
        totalSessions: effectiveTotal,
        totalRecords,
        presentCount,
        absentCount: absentCount > 0 ? absentCount : derivedAbsent,
        lateCount,
        excusedCount,
        attendancePercentage,
        isLowAttendance: attendancePercentage < threshold && effectiveTotal > 0,
      };
    });
  }

  /**
   * Paginated Attendance History for Student
   */
  async getStudentAttendanceHistory(studentId, {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    status,
    subjectId,
  } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      studentId,
      ...(status && { status }),
      ...(subjectId && {
        session: { subjectId },
      }),
      ...(startDate || endDate
        ? {
            session: {
              ...(subjectId && { subjectId }),
              ...(startDate && { sessionDate: { gte: new Date(startDate) } }),
              ...(endDate && { sessionDate: { lte: new Date(endDate) } }),
            },
          }
        : {}),
    };

    const [records, totalCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          session: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  credits: true,
                },
              },
              section: {
                select: {
                  id: true,
                  name: true,
                },
              },
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { markedAt: 'desc' },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records, totalCount };
  }
}

export default new StudentRepository();
