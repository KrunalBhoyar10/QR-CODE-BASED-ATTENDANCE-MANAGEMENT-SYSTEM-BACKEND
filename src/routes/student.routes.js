import { Router } from 'express';
import * as studentController from '../controllers/student.controller.js';
import * as faceController from '../controllers/face.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { authLimiter, attendanceLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { faceUpload } from '../middleware/faceUpload.middleware.js';
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

// Check if a session is still active and if student already marked attendance
router.get('/attendance/session-status/:sessionId', studentController.checkSessionStatus);

// Attendance Summary, Subject-wise Breakdown & History
router.get('/attendance/summary',  studentController.getAttendanceSummary);
router.get('/attendance/subjects', studentController.getSubjectWiseAttendance);
router.get('/attendance/history',  validate(attendanceHistoryQuerySchema), studentController.getAttendanceHistory);

// ── Face Verification ──────────────────────────────────────────────────────
// POST   /student/face/register  → first-time registration (no change count used)
// PATCH  /student/face/update    → change photo (limit: 2, or teacher-authorized)
// GET    /student/face/status    → current face status + change count
router.post('/face/register', faceUpload.single('facePhoto'), faceController.registerFace);
router.patch('/face/update',  faceUpload.single('facePhoto'), faceController.updateFace);
router.get('/face/status',    faceController.getFaceStatus);

export default router;
