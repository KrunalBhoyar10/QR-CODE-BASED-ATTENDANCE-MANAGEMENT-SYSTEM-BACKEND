import { Router } from 'express';
import * as principalController from '../controllers/principal.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import {
  createHodSchema,
  updateHodSchema,
  updateHodStatusSchema,
  resetHodPasswordSchema,
  hodIdParamSchema,
  updatePrincipalProfileSchema,
  changePrincipalPasswordSchema,
  listHodsQuerySchema,
  attendanceQuerySchema,
  departmentIdParamSchema,
  programIdParamSchema,
  academicYearIdParamSchema,
  createDepartmentSchema,
} from '../validators/principal.validator.js';

const router = Router();

// Enforce JWT authentication and strict PRINCIPAL role authorization across all endpoints
router.use(authenticateJwt);
router.use(authorizeRoles('PRINCIPAL'));

// ==========================================
// 1. PRINCIPAL PROFILE & PASSWORD MANAGEMENT
// ==========================================
router.get('/profile', principalController.getProfile);
router.patch('/profile', validate(updatePrincipalProfileSchema), principalController.updateProfile);
router.post('/change-password', validate(changePrincipalPasswordSchema), principalController.changePassword);

// ==========================================
// 2. HOD MANAGEMENT
// ==========================================
router.post('/hods', validate(createHodSchema), principalController.createHod);
router.get('/hods', validate(listHodsQuerySchema), principalController.listHods);
router.get('/hods/:id', validate(hodIdParamSchema), principalController.getHodById);
router.patch('/hods/:id', validate(updateHodSchema), principalController.updateHod);
router.patch('/hods/:id/status', validate(updateHodStatusSchema), principalController.updateHodStatus);
router.post('/hods/:id/reset-password', validate(resetHodPasswordSchema), principalController.resetHodPassword);
router.delete('/hods/:id', validate(hodIdParamSchema), principalController.deleteHod);

// ==========================================
// 3. ACADEMIC HIERARCHY NAVIGATION
// ==========================================
router.post('/departments', validate(createDepartmentSchema), principalController.createDepartment);
router.get('/departments', principalController.getDepartments);
router.get('/departments/:id', validate(departmentIdParamSchema), principalController.getDepartmentById);
router.get('/departments/:id/programs', validate(departmentIdParamSchema), principalController.getProgramsByDepartment);
router.get('/programs/:id/academic-years', validate(programIdParamSchema), principalController.getAcademicYearsByProgram);
router.get('/academic-years/:id/sections', validate(academicYearIdParamSchema), principalController.getSectionsByAcademicYear);

// ==========================================
// 4. ATTENDANCE MONITORING & ANALYTICS
// ==========================================
router.get('/attendance/summary', validate(attendanceQuerySchema), principalController.getAttendanceSummary);
router.get('/attendance/departments', validate(attendanceQuerySchema), principalController.getDepartmentWiseAttendance);
router.get('/attendance/programs', validate(attendanceQuerySchema), principalController.getProgramWiseAttendance);
router.get('/attendance/academic-years', validate(attendanceQuerySchema), principalController.getAcademicYearWiseAttendance);
router.get('/attendance/sections', validate(attendanceQuerySchema), principalController.getSectionWiseAttendance);
router.get('/attendance/subjects', validate(attendanceQuerySchema), principalController.getSubjectWiseAttendance);
router.get('/attendance/low-attendance', validate(attendanceQuerySchema), principalController.getLowAttendance);
router.get('/reports', validate(attendanceQuerySchema), principalController.getReportsSummary);

export default router;
