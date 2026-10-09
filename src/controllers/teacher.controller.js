import teacherService from '../services/teacher.service.js';
import { successResponse } from '../utils/response.js';

// ─────────────────────────────────────────────────────────
// 1. Profile & Password
// ─────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const profile = await teacherService.getProfile(req.user.id);
    return successResponse(res, 200, 'Teacher profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await teacherService.updateProfile(req.user.id, req.body, req);
    return successResponse(res, 200, 'Teacher profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await teacherService.changePassword({
      userId: req.user.id,
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
// 2. Teaching Assignments
// ─────────────────────────────────────────────────────────

export const getAssignments = async (req, res, next) => {
  try {
    const data = await teacherService.getAssignments(req.user.id, req.query);
    return successResponse(res, 200, 'Teaching assignments retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await teacherService.getAssignmentById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Teaching assignment retrieved successfully', assignment);
  } catch (error) {
    next(error);
  }
};

export const getAssignedPrograms = async (req, res, next) => {
  try {
    const programs = await teacherService.getAssignedPrograms(req.user.id);
    return successResponse(res, 200, 'Assigned programs retrieved successfully', programs);
  } catch (error) {
    next(error);
  }
};

export const getAssignedAcademicYears = async (req, res, next) => {
  try {
    const programId = req.params.programId || req.query.programId;
    const academicYears = await teacherService.getAssignedAcademicYears(req.user.id, programId);
    return successResponse(res, 200, 'Assigned academic years retrieved successfully', academicYears);
  } catch (error) {
    next(error);
  }
};

export const getAssignedSections = async (req, res, next) => {
  try {
    const academicYearId = req.params.academicYearId || req.query.academicYearId;
    const sections = await teacherService.getAssignedSections(req.user.id, academicYearId);
    return successResponse(res, 200, 'Assigned sections retrieved successfully', sections);
  } catch (error) {
    next(error);
  }
};

export const getAssignedSubjects = async (req, res, next) => {
  try {
    const subjects = await teacherService.getAssignedSubjects(req.user.id, req.query);
    return successResponse(res, 200, 'Assigned subjects retrieved successfully', subjects);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 3. Attendance Sessions
// ─────────────────────────────────────────────────────────

export const createSession = async (req, res, next) => {
  try {
    const sessionData = await teacherService.createSession(req.user.id, req.body, req);
    return successResponse(res, 201, 'Attendance session created successfully', sessionData);
  } catch (error) {
    next(error);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const activeSessions = await teacherService.getActiveSessions(req.user.id);
    return successResponse(res, 200, 'Active attendance sessions retrieved successfully', activeSessions);
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const { sessions, pagination } = await teacherService.getSessions(req.user.id, req.query);
    return successResponse(res, 200, 'Attendance sessions retrieved successfully', sessions, pagination);
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const data = await teacherService.getSessionById(req.user.id, req.params.id);
    return successResponse(res, 200, 'Attendance session retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const closeSession = async (req, res, next) => {
  try {
    const result = await teacherService.closeSession(req.user.id, req.params.id, req);
    return successResponse(res, 200, result.message, result.session);
  } catch (error) {
    next(error);
  }
};

export const getSessionAttendance = async (req, res, next) => {
  try {
    const data = await teacherService.getSessionAttendance(req.user.id, req.params.id, req.query);
    return successResponse(res, 200, 'Session attendance retrieved successfully', data.records, {
      ...data.pagination,
      summary: data.summary,
      session: data.session,
    });
  } catch (error) {
    next(error);
  }
};export const getStudentsBySection = async (req, res, next) => {
  try {
    const students = await teacherService.getStudentsBySection(req.user.id, req.params.sectionId);
    return successResponse(res, 200, 'Section students retrieved successfully', students);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const result = await teacherService.deleteStudent(req.user.id, req.params.studentId, req);
    return successResponse(res, 200, 'Student deleted successfully', result);
  } catch (error) {
    next(error);
  }
};


