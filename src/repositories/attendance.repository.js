import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { DEFAULT_LOW_ATTENDANCE_THRESHOLD } from '../constants/attendance.constants.js';

class AttendanceRepository {
  /**
   * Overall Attendance Summary Aggregation
   */
  async getOverallSummary({
    departmentId,
    programId,
    academicYearId,
    sectionId,
    subjectId,
    startDate,
    endDate,
  } = {}) {
    // 1. Build dynamic WHERE conditions for session/records
    const sessionConditions = [];
    if (startDate) {
      sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    }
    if (endDate) {
      sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);
    }
    if (sectionId) {
      sessionConditions.push(Prisma.sql`s."sectionId" = ${sectionId}`);
    }
    if (subjectId) {
      sessionConditions.push(Prisma.sql`s."subjectId" = ${subjectId}`);
    }
    if (academicYearId) {
      sessionConditions.push(Prisma.sql`sec."academicYearId" = ${academicYearId}`);
    }
    if (programId) {
      sessionConditions.push(Prisma.sql`sub."programId" = ${programId}`);
    }
    if (departmentId) {
      sessionConditions.push(Prisma.sql`sub."departmentId" = ${departmentId}`);
    }

    const whereClause = sessionConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    // 2. Aggregate counts in PostgreSQL
    const aggregateQuery = Prisma.sql`
      SELECT 
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        COUNT(CASE WHEN ar.status = 'LATE' THEN 1 END)::int AS "lateCount",
        COUNT(CASE WHEN ar.status = 'EXCUSED' THEN 1 END)::int AS "excusedCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM attendance_sessions s
      JOIN subjects sub ON s."subjectId" = sub.id
      JOIN sections sec ON s."sectionId" = sec.id
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      ${whereClause};
    `;

    // 3. Count total distinct enrolled/registered students in the matching scope
    const studentConditions = [];
    if (departmentId) studentConditions.push(Prisma.sql`st."departmentId" = ${departmentId}`);
    if (programId) studentConditions.push(Prisma.sql`st."programId" = ${programId}`);
    if (academicYearId) studentConditions.push(Prisma.sql`st."academicYearId" = ${academicYearId}`);
    if (sectionId) studentConditions.push(Prisma.sql`st."sectionId" = ${sectionId}`);

    const studentWhere = studentConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(studentConditions, ' AND ')}`
      : Prisma.empty;

    const studentCountQuery = Prisma.sql`
      SELECT COUNT(DISTINCT st.id)::int AS "totalStudents"
      FROM students st
      JOIN users u ON st."userId" = u.id
      ${studentWhere};
    `;

    const [aggResult, studentResult] = await Promise.all([
      prisma.$queryRaw(aggregateQuery),
      prisma.$queryRaw(studentCountQuery),
    ]);

    const stats = aggResult[0] || {};
    const totalStudents = Number(studentResult[0]?.totalStudents || 0);

    return {
      totalStudents,
      totalSessions: Number(stats.totalSessions || 0),
      totalRecords: Number(stats.totalRecords || 0),
      presentCount: Number(stats.presentCount || 0),
      absentCount: Number(stats.absentCount || 0),
      lateCount: Number(stats.lateCount || 0),
      excusedCount: Number(stats.excusedCount || 0),
      attendancePercentage: Number(stats.attendancePercentage || 0),
    };
  }

  /**
   * Department-wise Attendance Breakdown
   */
  async getDepartmentWiseAttendance({ startDate, endDate } = {}) {
    const sessionConditions = [];
    if (startDate) sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const sessionJoinCondition = sessionConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
      SELECT 
        d.id AS "departmentId",
        d.name AS "departmentName",
        d.code AS "departmentCode",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        COUNT(CASE WHEN ar.status = 'LATE' THEN 1 END)::int AS "lateCount",
        COUNT(CASE WHEN ar.status = 'EXCUSED' THEN 1 END)::int AS "excusedCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM departments d
      LEFT JOIN subjects sub ON sub."departmentId" = d.id
      LEFT JOIN attendance_sessions s ON s."subjectId" = sub.id ${sessionJoinCondition}
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name ASC;
    `;

    const results = await prisma.$queryRaw(query);
    return results.map((row) => ({
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      departmentCode: row.departmentCode,
      totalSessions: Number(row.totalSessions || 0),
      totalRecords: Number(row.totalRecords || 0),
      presentCount: Number(row.presentCount || 0),
      absentCount: Number(row.absentCount || 0),
      lateCount: Number(row.lateCount || 0),
      excusedCount: Number(row.excusedCount || 0),
      attendancePercentage: Number(row.attendancePercentage || 0),
    }));
  }

  /**
   * Program-wise Attendance Breakdown
   */
  async getProgramWiseAttendance({ departmentId, startDate, endDate } = {}) {
    const whereConditions = [];
    if (departmentId) {
      whereConditions.push(Prisma.sql`p."departmentId" = ${departmentId}`);
    }

    const sessionConditions = [];
    if (startDate) sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const sessionJoinCondition = sessionConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
      SELECT 
        p.id AS "programId",
        p.name AS "programName",
        p.code AS "programCode",
        d.id AS "departmentId",
        d.name AS "departmentName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM programs p
      JOIN departments d ON p."departmentId" = d.id
      LEFT JOIN subjects sub ON sub."programId" = p.id
      LEFT JOIN attendance_sessions s ON s."subjectId" = sub.id ${sessionJoinCondition}
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      ${whereClause}
      GROUP BY p.id, p.name, p.code, d.id, d.name
      ORDER BY p.name ASC;
    `;

    const results = await prisma.$queryRaw(query);
    return results.map((row) => ({
      programId: row.programId,
      programName: row.programName,
      programCode: row.programCode,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      totalSessions: Number(row.totalSessions || 0),
      totalRecords: Number(row.totalRecords || 0),
      presentCount: Number(row.presentCount || 0),
      absentCount: Number(row.absentCount || 0),
      attendancePercentage: Number(row.attendancePercentage || 0),
    }));
  }

  /**
   * Academic-Year-wise Attendance Breakdown
   */
  async getAcademicYearWiseAttendance({ programId, departmentId, startDate, endDate } = {}) {
    const whereConditions = [];
    if (programId) whereConditions.push(Prisma.sql`ay."programId" = ${programId}`);
    if (departmentId) whereConditions.push(Prisma.sql`p."departmentId" = ${departmentId}`);

    const sessionConditions = [];
    if (startDate) sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const sessionJoinCondition = sessionConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
      SELECT 
        ay.id AS "academicYearId",
        ay."yearNumber",
        ay.label AS "academicYearLabel",
        p.id AS "programId",
        p.name AS "programName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM academic_years ay
      JOIN programs p ON ay."programId" = p.id
      LEFT JOIN sections sec ON sec."academicYearId" = ay.id
      LEFT JOIN attendance_sessions s ON s."sectionId" = sec.id ${sessionJoinCondition}
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      ${whereClause}
      GROUP BY ay.id, ay."yearNumber", ay.label, p.id, p.name
      ORDER BY ay."yearNumber" ASC;
    `;

    const results = await prisma.$queryRaw(query);
    return results.map((row) => ({
      academicYearId: row.academicYearId,
      yearNumber: row.yearNumber,
      label: row.academicYearLabel,
      programId: row.programId,
      programName: row.programName,
      totalSessions: Number(row.totalSessions || 0),
      totalRecords: Number(row.totalRecords || 0),
      presentCount: Number(row.presentCount || 0),
      absentCount: Number(row.absentCount || 0),
      attendancePercentage: Number(row.attendancePercentage || 0),
    }));
  }

  /**
   * Section-wise Attendance Breakdown
   */
  async getSectionWiseAttendance({ academicYearId, programId, departmentId, startDate, endDate } = {}) {
    const whereConditions = [];
    if (academicYearId) whereConditions.push(Prisma.sql`sec."academicYearId" = ${academicYearId}`);
    if (programId) whereConditions.push(Prisma.sql`ay."programId" = ${programId}`);
    if (departmentId) whereConditions.push(Prisma.sql`p."departmentId" = ${departmentId}`);

    const sessionConditions = [];
    if (startDate) sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const sessionJoinCondition = sessionConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
      SELECT 
        sec.id AS "sectionId",
        sec.name AS "sectionName",
        ay.id AS "academicYearId",
        ay.label AS "academicYearLabel",
        p.id AS "programId",
        p.name AS "programName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM sections sec
      JOIN academic_years ay ON sec."academicYearId" = ay.id
      JOIN programs p ON ay."programId" = p.id
      LEFT JOIN attendance_sessions s ON s."sectionId" = sec.id ${sessionJoinCondition}
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      ${whereClause}
      GROUP BY sec.id, sec.name, ay.id, ay.label, p.id, p.name
      ORDER BY sec.name ASC;
    `;

    const results = await prisma.$queryRaw(query);
    return results.map((row) => ({
      sectionId: row.sectionId,
      sectionName: row.sectionName,
      academicYearId: row.academicYearId,
      academicYearLabel: row.academicYearLabel,
      programId: row.programId,
      programName: row.programName,
      totalSessions: Number(row.totalSessions || 0),
      totalRecords: Number(row.totalRecords || 0),
      presentCount: Number(row.presentCount || 0),
      absentCount: Number(row.absentCount || 0),
      attendancePercentage: Number(row.attendancePercentage || 0),
    }));
  }

  /**
   * Subject-wise Attendance Breakdown
   */
  async getSubjectWiseAttendance({
    departmentId,
    programId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = {}) {
    const offset = (page - 1) * limit;
    const whereConditions = [];
    if (departmentId) whereConditions.push(Prisma.sql`sub."departmentId" = ${departmentId}`);
    if (programId) whereConditions.push(Prisma.sql`sub."programId" = ${programId}`);

    const sessionConditions = [];
    if (startDate) sessionConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) sessionConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const sessionJoinCondition = sessionConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(sessionConditions, ' AND ')}`
      : Prisma.empty;

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
      SELECT 
        sub.id AS "subjectId",
        sub.name AS "subjectName",
        sub.code AS "subjectCode",
        d.name AS "departmentName",
        p.name AS "programName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        CASE 
          WHEN COUNT(ar.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2)
          ELSE 0.00
        END AS "attendancePercentage"
      FROM subjects sub
      JOIN departments d ON sub."departmentId" = d.id
      JOIN programs p ON sub."programId" = p.id
      LEFT JOIN attendance_sessions s ON s."subjectId" = sub.id ${sessionJoinCondition}
      LEFT JOIN attendance_records ar ON s.id = ar."sessionId"
      ${whereClause}
      GROUP BY sub.id, sub.name, sub.code, d.name, p.name
      ORDER BY sub.name ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(sub.id)::int AS "totalCount"
      FROM subjects sub
      ${whereClause};
    `;

    const [results, countResult] = await Promise.all([
      prisma.$queryRaw(query),
      prisma.$queryRaw(countQuery),
    ]);

    const totalCount = Number(countResult[0]?.totalCount || 0);

    return {
      subjects: results.map((row) => ({
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        departmentName: row.departmentName,
        programName: row.programName,
        totalSessions: Number(row.totalSessions || 0),
        totalRecords: Number(row.totalRecords || 0),
        presentCount: Number(row.presentCount || 0),
        absentCount: Number(row.absentCount || 0),
        attendancePercentage: Number(row.attendancePercentage || 0),
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
   * Low-Attendance Students (Database Aggregation with HAVING percentage < threshold)
   */
  async getLowAttendanceStudents({
    threshold = DEFAULT_LOW_ATTENDANCE_THRESHOLD,
    departmentId,
    programId,
    academicYearId,
    sectionId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = {}) {
    const offset = (page - 1) * limit;
    const numThreshold = Number(threshold);

    const whereConditions = [];
    if (departmentId) whereConditions.push(Prisma.sql`st."departmentId" = ${departmentId}`);
    if (programId) whereConditions.push(Prisma.sql`st."programId" = ${programId}`);
    if (academicYearId) whereConditions.push(Prisma.sql`st."academicYearId" = ${academicYearId}`);
    if (sectionId) whereConditions.push(Prisma.sql`st."sectionId" = ${sectionId}`);
    if (startDate) whereConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) whereConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const dataQuery = Prisma.sql`
      SELECT 
        st.id AS "studentId",
        st."rollNumber",
        st."enrollmentNumber",
        u."firstName",
        u."lastName",
        u.email,
        d.name AS "departmentName",
        p.name AS "programName",
        sec.name AS "sectionName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2) AS "attendancePercentage"
      FROM students st
      JOIN users u ON st."userId" = u.id
      JOIN departments d ON st."departmentId" = d.id
      JOIN programs p ON st."programId" = p.id
      JOIN sections sec ON st."sectionId" = sec.id
      JOIN attendance_records ar ON ar."studentId" = st.id
      JOIN attendance_sessions s ON ar."sessionId" = s.id
      ${whereClause}
      GROUP BY st.id, st."rollNumber", st."enrollmentNumber", u."firstName", u."lastName", u.email, d.name, p.name, sec.name
      HAVING COUNT(ar.id) > 0 
        AND ((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100) < ${numThreshold}
      ORDER BY "attendancePercentage" ASC, u."lastName" ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(*)::int AS "totalCount"
      FROM (
        SELECT st.id
        FROM students st
        JOIN attendance_records ar ON ar."studentId" = st.id
        JOIN attendance_sessions s ON ar."sessionId" = s.id
        ${whereClause}
        GROUP BY st.id
        HAVING COUNT(ar.id) > 0 
          AND ((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100) < ${numThreshold}
      ) AS low_students;
    `;

    const [results, countResult] = await Promise.all([
      prisma.$queryRaw(dataQuery),
      prisma.$queryRaw(countQuery),
    ]);

    const totalCount = Number(countResult[0]?.totalCount || 0);

    return {
      threshold: numThreshold,
      students: results.map((row) => ({
        studentId: row.studentId,
        rollNumber: row.rollNumber,
        enrollmentNumber: row.enrollmentNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        departmentName: row.departmentName,
        programName: row.programName,
        sectionName: row.sectionName,
        totalSessions: Number(row.totalSessions || 0),
        totalRecords: Number(row.totalRecords || 0),
        presentCount: Number(row.presentCount || 0),
        absentCount: Number(row.absentCount || 0),
        attendancePercentage: Number(row.attendancePercentage || 0),
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
   * Low-Attendance Subjects (Database Aggregation with HAVING percentage < threshold)
   */
  async getLowAttendanceSubjects({
    threshold = DEFAULT_LOW_ATTENDANCE_THRESHOLD,
    departmentId,
    programId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = {}) {
    const offset = (page - 1) * limit;
    const numThreshold = Number(threshold);

    const whereConditions = [];
    if (departmentId) whereConditions.push(Prisma.sql`sub."departmentId" = ${departmentId}`);
    if (programId) whereConditions.push(Prisma.sql`sub."programId" = ${programId}`);
    if (startDate) whereConditions.push(Prisma.sql`s."sessionDate" >= ${new Date(startDate)}`);
    if (endDate) whereConditions.push(Prisma.sql`s."sessionDate" <= ${new Date(endDate)}`);

    const whereClause = whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
      : Prisma.empty;

    const dataQuery = Prisma.sql`
      SELECT 
        sub.id AS "subjectId",
        sub.name AS "subjectName",
        sub.code AS "subjectCode",
        d.name AS "departmentName",
        p.name AS "programName",
        COUNT(DISTINCT s.id)::int AS "totalSessions",
        COUNT(ar.id)::int AS "totalRecords",
        COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::int AS "presentCount",
        COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END)::int AS "absentCount",
        ROUND((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100, 2) AS "attendancePercentage"
      FROM subjects sub
      JOIN departments d ON sub."departmentId" = d.id
      JOIN programs p ON sub."programId" = p.id
      JOIN attendance_sessions s ON s."subjectId" = sub.id
      JOIN attendance_records ar ON ar."sessionId" = s.id
      ${whereClause}
      GROUP BY sub.id, sub.name, sub.code, d.name, p.name
      HAVING COUNT(ar.id) > 0 
        AND ((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100) < ${numThreshold}
      ORDER BY "attendancePercentage" ASC, sub.name ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(*)::int AS "totalCount"
      FROM (
        SELECT sub.id
        FROM subjects sub
        JOIN attendance_sessions s ON s."subjectId" = sub.id
        JOIN attendance_records ar ON ar."sessionId" = s.id
        ${whereClause}
        GROUP BY sub.id
        HAVING COUNT(ar.id) > 0 
          AND ((COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::numeric / COUNT(ar.id)::numeric) * 100) < ${numThreshold}
      ) AS low_subjects;
    `;

    const [results, countResult] = await Promise.all([
      prisma.$queryRaw(dataQuery),
      prisma.$queryRaw(countQuery),
    ]);

    const totalCount = Number(countResult[0]?.totalCount || 0);

    return {
      threshold: numThreshold,
      subjects: results.map((row) => ({
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        departmentName: row.departmentName,
        programName: row.programName,
        totalSessions: Number(row.totalSessions || 0),
        totalRecords: Number(row.totalRecords || 0),
        presentCount: Number(row.presentCount || 0),
        absentCount: Number(row.absentCount || 0),
        attendancePercentage: Number(row.attendancePercentage || 0),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }
}

export default new AttendanceRepository();
