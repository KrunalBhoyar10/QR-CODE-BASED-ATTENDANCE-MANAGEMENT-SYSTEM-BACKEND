import registrationService from '../services/registration.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/register/programs
 * Returns all active programs (public, no auth required)
 */
export const getPrograms = async (req, res, next) => {
  try {
    const programs = await registrationService.getPrograms();
    return successResponse(res, 200, 'Programs retrieved successfully', programs);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/register/programs/:programId/academic-years
 * Returns academic years for a program (public)
 */
export const getAcademicYears = async (req, res, next) => {
  try {
    const years = await registrationService.getAcademicYearsByProgram(req.params.programId);
    return successResponse(res, 200, 'Academic years retrieved successfully', years);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/register/academic-years/:academicYearId/sections
 * Returns sections for an academic year (public)
 */
export const getSections = async (req, res, next) => {
  try {
    const sections = await registrationService.getSectionsByAcademicYear(req.params.academicYearId);
    return successResponse(res, 200, 'Sections retrieved successfully', sections);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/register/sections/:sectionId/subjects
 * Returns subjects for a section's program (public)
 */
export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await registrationService.getSubjectsBySection(req.params.sectionId);
    return successResponse(res, 200, 'Subjects retrieved successfully', subjects);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/register/student
 * Register a new student account (public)
 */
export const registerStudent = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await registrationService.registerStudent({
      ...req.body,
      ipAddress,
      userAgent,
    });

    return successResponse(res, 201, result.message, {
      userId: result.userId,
      studentId: result.studentId,
    });
  } catch (error) {
    next(error);
  }
};
