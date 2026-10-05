import hodService from '../services/hod.service.js';
import { successResponse } from '../utils/response.js';

// ─────────────────────────────────────────────────────────
// 1. Profile & Password
// ─────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const profile = await hodService.getProfile(req.user.id);
    return successResponse(res, 200, 'HOD profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await hodService.updateProfile(req.user.id, req.body, req);
    return successResponse(res, 200, 'HOD profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await hodService.changePassword({
      hodUserId: req.user.id,
      currentPassword,
      newPassword,
      req,
    });
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 2. Programs
// ─────────────────────────────────────────────────────────

export const listPrograms = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const programs = await hodService.listPrograms(req.user.id, { isActive });
    return successResponse(res, 200, 'Programs retrieved successfully', programs);
  } catch (error) {
    next(error);
  }
};

export const getProgramById = async (req, res, next) => {
  try {
    const program = await hodService.getProgramById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Program retrieved successfully', program);
  } catch (error) {
    next(error);
  }
};

export const createProgram = async (req, res, next) => {
  try {
    const program = await hodService.createProgram(req.user.id, req.body, req);
    return successResponse(res, 201, 'Program created successfully', program);
  } catch (error) {
    next(error);
  }
};

export const updateProgram = async (req, res, next) => {
  try {
    const updated = await hodService.updateProgram(req.user.id, req.params.id, req.body, req);
    return successResponse(res, 200, 'Program updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 3. Academic Years
// ─────────────────────────────────────────────────────────

export const listAcademicYears = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const academicYears = await hodService.listAcademicYears(req.user.id, programId);
    return successResponse(res, 200, 'Academic years retrieved successfully', academicYears);
  } catch (error) {
    next(error);
  }
};

export const getAcademicYearById = async (req, res, next) => {
  try {
    const academicYear = await hodService.getAcademicYearById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Academic year retrieved successfully', academicYear);
  } catch (error) {
    next(error);
  }
};

export const createAcademicYear = async (req, res, next) => {
  try {
    const academicYear = await hodService.createAcademicYear(req.user.id, req.body, req);
    return successResponse(res, 201, 'Academic year created successfully', academicYear);
  } catch (error) {
    next(error);
  }
};

export const updateAcademicYear = async (req, res, next) => {
  try {
    const updated = await hodService.updateAcademicYear(req.user.id, req.params.id, req.body, req);
    return successResponse(res, 200, 'Academic year updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 4. Sections
// ─────────────────────────────────────────────────────────

export const listSections = async (req, res, next) => {
  try {
    const { academicYearId } = req.params;
    const sections = await hodService.listSections(req.user.id, academicYearId);
    return successResponse(res, 200, 'Sections retrieved successfully', sections);
  } catch (error) {
    next(error);
  }
};

export const getSectionById = async (req, res, next) => {
  try {
    const section = await hodService.getSectionById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Section retrieved successfully', section);
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const section = await hodService.createSection(req.user.id, req.body, req);
    return successResponse(res, 201, 'Section created successfully', section);
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const updated = await hodService.updateSection(req.user.id, req.params.id, req.body, req);
    return successResponse(res, 200, 'Section updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 5. Subjects
// ─────────────────────────────────────────────────────────

export const listSubjects = async (req, res, next) => {
  try {
    const { programId, isActive } = req.query;
    const subjects = await hodService.listSubjects(req.user.id, { programId, isActive });
    return successResponse(res, 200, 'Subjects retrieved successfully', subjects);
  } catch (error) {
    next(error);
  }
};

export const getSubjectById = async (req, res, next) => {
  try {
    const subject = await hodService.getSubjectById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Subject retrieved successfully', subject);
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const subject = await hodService.createSubject(req.user.id, req.body, req);
    return successResponse(res, 201, 'Subject created successfully', subject);
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const updated = await hodService.updateSubject(req.user.id, req.params.id, req.body, req);
    return successResponse(res, 200, 'Subject updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 6. Teachers
// ─────────────────────────────────────────────────────────

export const listTeachers = async (req, res, next) => {
  try {
    const { page, limit, search, isActive } = req.query;
    const result = await hodService.listTeachers(req.user.id, { page, limit, search, isActive });
    return successResponse(res, 200, 'Teachers retrieved successfully', result.teachers, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await hodService.getTeacherById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Teacher retrieved successfully', teacher);
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req, res, next) => {
  try {
    const result = await hodService.createTeacher(req.user.id, req.body, req);
    return successResponse(res, 201, result.message, {
      teacher: result.teacher,
      ...(result.temporaryPassword && { temporaryPassword: result.temporaryPassword }),
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeacherStatus = async (req, res, next) => {
  try {
    const { isActive, reason } = req.body;
    const result = await hodService.updateTeacherStatus(req.user.id, req.params.id, isActive, reason, req);
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const resetTeacherPassword = async (req, res, next) => {
  try {
    const temporaryPassword = req.body?.temporaryPassword;
    const result = await hodService.resetTeacherPassword(req.user.id, req.params.id, temporaryPassword, req);
    return successResponse(res, 200, result.message, { temporaryPassword: result.temporaryPassword });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 7. Teaching Assignments
// ─────────────────────────────────────────────────────────

export const listAssignments = async (req, res, next) => {
  try {
    const assignments = await hodService.listAssignments(req.user.id, req.query);
    return successResponse(res, 200, 'Teaching assignments retrieved successfully', assignments);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await hodService.getAssignmentById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Teaching assignment retrieved successfully', assignment);
  } catch (error) {
    next(error);
  }
};

export const createTeachingAssignment = async (req, res, next) => {
  try {
    const assignment = await hodService.createTeachingAssignment(req.user.id, req.body, req);
    return successResponse(res, 201, 'Teaching assignment created successfully', assignment);
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await hodService.updateAssignmentStatus(req.user.id, req.params.id, status, req);
    return successResponse(res, 200, 'Teaching assignment status updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 8. Students
// ─────────────────────────────────────────────────────────

export const listStudents = async (req, res, next) => {
  try {
    const { page, limit, search, programId, sectionId } = req.query;
    const result = await hodService.listStudents(req.user.id, { page, limit, search, programId, sectionId });
    return successResponse(res, 200, 'Students retrieved successfully', result.students, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const student = await hodService.getStudentById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Student retrieved successfully', student);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 9. Attendance
// ─────────────────────────────────────────────────────────

export const getDepartmentAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await hodService.getDepartmentAttendanceSummary(req.user.id, req.query);
    return successResponse(res, 200, 'Department attendance summary retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
};

export const getProgramAttendance = async (req, res, next) => {
  try {
    const breakdown = await hodService.getProgramAttendance(req.user.id, req.query);
    return successResponse(res, 200, 'Program attendance retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

export const getAcademicYearAttendance = async (req, res, next) => {
  try {
    const breakdown = await hodService.getAcademicYearAttendance(req.user.id, req.query);
    return successResponse(res, 200, 'Academic year attendance retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

export const getSectionAttendance = async (req, res, next) => {
  try {
    const breakdown = await hodService.getSectionAttendance(req.user.id, req.query);
    return successResponse(res, 200, 'Section attendance retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

export const getSubjectAttendance = async (req, res, next) => {
  try {
    const breakdown = await hodService.getSubjectAttendance(req.user.id, req.query);
    return successResponse(
      res,
      200,
      'Subject attendance retrieved successfully',
      breakdown.subjects,
      breakdown.pagination
    );
  } catch (error) {
    next(error);
  }
};

export const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const result = await hodService.getStudentAttendance(req.user.id, studentId, req.query);
    return successResponse(
      res,
      200,
      'Student attendance retrieved successfully',
      result.records,
      {
        totalCount: result.totalCount,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getLowAttendance = async (req, res, next) => {
  try {
    const result = await hodService.getLowAttendance(req.user.id, req.query);
    return successResponse(res, 200, 'Low-attendance analytics retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getReportsSummary = async (req, res, next) => {
  try {
    const report = await hodService.getReportsSummary(req.user.id, req.query);
    return successResponse(res, 200, 'HOD department report generated successfully', report);
  } catch (error) {
    next(error);
  }
};
