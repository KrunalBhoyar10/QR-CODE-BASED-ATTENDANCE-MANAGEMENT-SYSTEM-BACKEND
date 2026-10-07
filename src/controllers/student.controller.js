import studentService from '../services/student.service.js';
import { successResponse } from '../utils/response.js';

// ─────────────────────────────────────────────────────────
// 1. Profile & Password Management
// ─────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const profile = await studentService.getProfile(req.user.id);
    return successResponse(res, 200, 'Student profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await studentService.updateProfile(req.user.id, req.body, req);
    return successResponse(res, 200, 'Student profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await studentService.changePassword({
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

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await studentService.forgotPassword({ email, req });
    return successResponse(res, 200, result.message, {
      ...(result.resetToken && { resetToken: result.resetToken }),
      ...(result.expiresAt && { expiresAt: result.expiresAt }),
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await studentService.resetPassword({ token, newPassword, req });
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 2. Student Enrollment
// ─────────────────────────────────────────────────────────

export const getEnrollments = async (req, res, next) => {
  try {
    const data = await studentService.getEnrollments(req.user.id);
    return successResponse(res, 200, 'Student enrollment details retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 3. Mark Attendance (QR Scan)
// ─────────────────────────────────────────────────────────

export const markAttendance = async (req, res, next) => {
  try {
    const result = await studentService.markAttendance(req.user.id, req.body, req);
    return successResponse(res, 201, 'Attendance marked successfully', result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// 4. Attendance Summary, Subjects & History
// ─────────────────────────────────────────────────────────

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await studentService.getAttendanceSummary(req.user.id);
    return successResponse(res, 200, 'Student attendance summary retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
};

export const getSubjectWiseAttendance = async (req, res, next) => {
  try {
    const subjects = await studentService.getSubjectWiseAttendance(req.user.id);
    return successResponse(res, 200, 'Subject-wise attendance retrieved successfully', subjects);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req, res, next) => {
  try {
    const { records, pagination } = await studentService.getAttendanceHistory(req.user.id, req.query);
    return successResponse(res, 200, 'Attendance history retrieved successfully', records, pagination);
  } catch (error) {
    next(error);
  }
};
