import { Router } from 'express';
import * as studentController from '../controllers/student.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { authLimiter, attendanceLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  updateStudentProfileSchema,
  changeStudentPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  markAttendanceSchema,
  attendanceHistoryQuerySchema,
} from '../validators/student.validator.js';

const router = Router();

// ============================================================
// 1. PUBLIC AUTH & PASSWORD RESET ROUTES
// ============================================================
// passwordResetLimiter: 5 requests/15min — prevents enumeration & flooding
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), studentController.forgotPassword);
router.post('/reset-password',  passwordResetLimiter, validate(resetPasswordSchema),  studentController.resetPassword);

// ============================================================
// 2. PROTECTED STUDENT ROUTES (Require Auth + STUDENT Role)
// ============================================================
router.use(authenticateJwt);
router.use(authorizeRoles('STUDENT'));

// Profile & Password
router.get('/profile',         studentController.getProfile);
router.patch('/profile',       validate(updateStudentProfileSchema), studentController.updateProfile);
router.post('/change-password', authLimiter, validate(changeStudentPasswordSchema), studentController.changePassword);

// Institutional Enrollment
router.get('/enrollments', studentController.getEnrollments);

// Attendance Marking Workflow (QR Code + GPS + Face Verification)
// attendanceLimiter: 10 requests/min — prevents replay flooding of QR attendance endpoint
router.post('/attendance/mark', attendanceLimiter, validate(markAttendanceSchema), studentController.markAttendance);

// Attendance Summary, Subject-wise Breakdown & History
router.get('/attendance/summary',  studentController.getAttendanceSummary);
router.get('/attendance/subjects', studentController.getSubjectWiseAttendance);
router.get('/attendance/history',  validate(attendanceHistoryQuerySchema), studentController.getAttendanceHistory);

export default router;
