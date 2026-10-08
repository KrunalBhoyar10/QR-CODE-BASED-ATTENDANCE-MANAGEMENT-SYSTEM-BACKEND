import principalService from '../services/principal.service.js';
import { successResponse } from '../utils/response.js';

/**
 * Controller: Get Principal Profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await principalService.getProfile(req.user.id);
    return successResponse(res, 200, 'Principal profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update Principal Profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const updatedProfile = await principalService.updateProfile(req.user.id, req.body, req);
    return successResponse(res, 200, 'Principal profile updated successfully', updatedProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Principal Change Password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await principalService.changePassword({
      principalId: req.user.id,
      currentPassword,
      newPassword,
      req,
    });
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create HOD
 */
export const createHod = async (req, res, next) => {
  try {
    const result = await principalService.createHod({
      principalId: req.user.id,
      data: req.body,
      req,
    });
    return successResponse(res, 201, result.message, {
      hod: result.hod,
      ...(result.temporaryPassword && { temporaryPassword: result.temporaryPassword }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: List HODs
 */
export const listHods = async (req, res, next) => {
  try {
    const result = await principalService.listHods(req.query);
    return successResponse(res, 200, 'HODs retrieved successfully', result.hods, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get HOD Details
 */
export const getHodById = async (req, res, next) => {
  try {
    const hod = await principalService.getHodById(req.params.id);
    return successResponse(res, 200, 'HOD details retrieved successfully', hod);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update HOD Details / Assignment
 */
export const updateHod = async (req, res, next) => {
  try {
    const updated = await principalService.updateHod({
      principalId: req.user.id,
      hodId: req.params.id,
      data: req.body,
      req,
    });
    return successResponse(res, 200, 'HOD updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update HOD Status (Active / Inactive)
 */
export const updateHodStatus = async (req, res, next) => {
  try {
    const { isActive, reason } = req.body;
    const result = await principalService.updateHodStatus({
      principalId: req.user.id,
      hodId: req.params.id,
      isActive,
      reason,
      req,
    });
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Reset HOD Password
 */
export const resetHodPassword = async (req, res, next) => {
  try {
    const temporaryPassword = req.body?.temporaryPassword;
    const result = await principalService.resetHodPassword({
      principalId: req.user.id,
      hodId: req.params.id,
      temporaryPassword,
      req,
    });
    return successResponse(res, 200, result.message, {
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Delete HOD
 */
export const deleteHod = async (req, res, next) => {
  try {
    const result = await principalService.deleteHod({
      principalId: req.user.id,
      hodId: req.params.id,
      req,
    });
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create Department
 */
export const createDepartment = async (req, res, next) => {
  try {
    const department = await principalService.createDepartment(req.body);
    return successResponse(res, 201, 'Department created successfully', department);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Departments
 */
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await principalService.getDepartments();
    return successResponse(res, 200, 'Departments retrieved successfully', departments);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Department by ID
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await principalService.getDepartmentById(req.params.id);
    return successResponse(res, 200, 'Department details retrieved successfully', department);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Programs by Department
 */
export const getProgramsByDepartment = async (req, res, next) => {
  try {
    const programs = await principalService.getProgramsByDepartment(req.params.id);
    return successResponse(res, 200, 'Programs retrieved successfully', programs);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Academic Years by Program
 */
export const getAcademicYearsByProgram = async (req, res, next) => {
  try {
    const academicYears = await principalService.getAcademicYearsByProgram(req.params.id);
    return successResponse(res, 200, 'Academic years retrieved successfully', academicYears);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Sections by Academic Year
 */
export const getSectionsByAcademicYear = async (req, res, next) => {
  try {
    const sections = await principalService.getSectionsByAcademicYear(req.params.id);
    return successResponse(res, 200, 'Sections retrieved successfully', sections);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Attendance Overall Summary
 */
export const getAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await principalService.getAttendanceSummary(req.query);
    return successResponse(res, 200, 'Attendance summary retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Department-wise Attendance
 */
export const getDepartmentWiseAttendance = async (req, res, next) => {
  try {
    const breakdown = await principalService.getDepartmentWiseAttendance(req.query);
    return successResponse(res, 200, 'Department attendance breakdown retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Program-wise Attendance
 */
export const getProgramWiseAttendance = async (req, res, next) => {
  try {
    const breakdown = await principalService.getProgramWiseAttendance(req.query);
    return successResponse(res, 200, 'Program attendance breakdown retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Academic-Year-wise Attendance
 */
export const getAcademicYearWiseAttendance = async (req, res, next) => {
  try {
    const breakdown = await principalService.getAcademicYearWiseAttendance(req.query);
    return successResponse(res, 200, 'Academic year attendance breakdown retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Section-wise Attendance
 */
export const getSectionWiseAttendance = async (req, res, next) => {
  try {
    const breakdown = await principalService.getSectionWiseAttendance(req.query);
    return successResponse(res, 200, 'Section attendance breakdown retrieved successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Subject-wise Attendance
 */
export const getSubjectWiseAttendance = async (req, res, next) => {
  try {
    const breakdown = await principalService.getSubjectWiseAttendance(req.query);
    return successResponse(res, 200, 'Subject attendance breakdown retrieved successfully', breakdown.subjects, breakdown.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Low-Attendance Reporting
 */
export const getLowAttendance = async (req, res, next) => {
  try {
    const result = await principalService.getLowAttendance(req.query);
    return successResponse(res, 200, 'Low-attendance analytics retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Reports Summary
 */
export const getReportsSummary = async (req, res, next) => {
  try {
    const report = await principalService.getReportsSummary(req.query);
    return successResponse(res, 200, 'Comprehensive attendance report generated successfully', report);
  } catch (error) {
    next(error);
  }
};
