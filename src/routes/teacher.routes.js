import { Router } from 'express';
import * as teacherController from '../controllers/teacher.controller.js';
import * as faceController from '../controllers/face.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import {
  // Profile & Password
  updateTeacherProfileSchema,
  changeTeacherPasswordSchema,
  // Teaching Assignments
  listAssignmentsQuerySchema,
  assignmentIdParamSchema,
  programIdForYearsParamSchema,
  academicYearIdForSectionsParamSchema,
  // Attendance Sessions
  createSessionSchema,
  sessionIdParamSchema,
  listSessionsQuerySchema,
  sessionAttendanceQuerySchema,
} from '../validators/teacher.validator.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// All teacher routes require authentication + TEACHER role
// ─────────────────────────────────────────────────────────
router.use(authenticateJwt);
router.use(authorizeRoles('TEACHER'));

// ============================================================
// 1. PROFILE & PASSWORD
// ============================================================
router.get('/profile', teacherController.getProfile);
router.patch('/profile', validate(updateTeacherProfileSchema), teacherController.updateProfile);
router.post('/change-password', validate(changeTeacherPasswordSchema), teacherController.changePassword);

// ============================================================
// 2. TEACHING ASSIGNMENTS & ASSIGNED SCOPES
// ============================================================
router.get('/assignments', validate(listAssignmentsQuerySchema), teacherController.getAssignments);
router.get('/assignments/:id', validate(assignmentIdParamSchema), teacherController.getAssignmentById);

router.get('/programs', teacherController.getAssignedPrograms);
router.get(
  '/programs/:programId/academic-years',
  validate(programIdForYearsParamSchema),
  teacherController.getAssignedAcademicYears
);
router.get('/academic-years', teacherController.getAssignedAcademicYears);
router.get(
  '/academic-years/:academicYearId/sections',
  validate(academicYearIdForSectionsParamSchema),
  teacherController.getAssignedSections
);
router.get('/sections', teacherController.getAssignedSections);
router.get('/subjects', teacherController.getAssignedSubjects);
router.get('/sections/:sectionId/students', teacherController.getStudentsBySection);
router.get('/sections/:sectionId/students/attendance', teacherController.getSectionStudentsAttendance);
router.get('/sections/:sectionId/students/attendance/:subjectId', teacherController.getSectionStudentsSubjectAttendance);
router.delete('/students/:studentId', teacherController.deleteStudent);
router.delete('/sections/:sectionId/students/:studentId', teacherController.deleteStudent);

// ============================================================
// 3. ATTENDANCE SESSIONS & ATTENDANCE RECORDS
// ============================================================
router.post('/sessions', validate(createSessionSchema), teacherController.createSession);
router.get('/sessions/active', teacherController.getActiveSessions);
router.get('/sessions', validate(listSessionsQuerySchema), teacherController.getSessions);
router.get('/sessions/:id', validate(sessionIdParamSchema), teacherController.getSessionById);
router.post('/sessions/:id/close', validate(sessionIdParamSchema), teacherController.closeSession);
router.get(
  '/sessions/:id/attendance',
  validate(sessionAttendanceQuerySchema),
  teacherController.getSessionAttendance
);

// ============================================================
// 4. FACE PHOTO AUTHORIZATION
// ============================================================
// GET    /teacher/students/:studentId/face-status    → view student face status
// POST   /teacher/students/:studentId/face-authorize → grant 1 extra change
// DELETE /teacher/students/:studentId/face-authorize → revoke authorization
router.get('/students/:studentId/face-status',    faceController.getStudentFaceStatus);
router.post('/students/:studentId/face-authorize',   faceController.authorizeStudentFaceChange);
router.delete('/students/:studentId/face-authorize', faceController.revokeStudentFaceAuth);

export default router;
