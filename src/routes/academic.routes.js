import { Router } from 'express';
import * as academicController from '../controllers/academic.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createProgramSchema,
  updateProgramSchema,
  createAcademicYearSchema,
  createSectionSchema,
  createSubjectSchema,
  updateSubjectSchema,
} from '../validators/academic.validator.js';

const router = Router();

// All academic routes require authentication
router.use(authenticateJwt);

// ==========================================
// DEPARTMENTS
// ==========================================
router.get('/departments', academicController.getAllDepartments);
router.get('/departments/:id', academicController.getDepartmentById);
router.post('/departments', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'), validate(createDepartmentSchema), academicController.createDepartment);
router.put('/departments/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'), validate(updateDepartmentSchema), academicController.updateDepartment);
router.delete('/departments/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'), academicController.deleteDepartment);

// ==========================================
// PROGRAMS
// ==========================================
router.get('/departments/:departmentId/programs', academicController.getProgramsByDepartment);
router.post('/programs', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(createProgramSchema), academicController.createProgram);
router.put('/programs/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(updateProgramSchema), academicController.updateProgram);
router.delete('/programs/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), academicController.deleteProgram);

// ==========================================
// ACADEMIC YEARS
// ==========================================
router.get('/programs/:programId/academic-years', academicController.getAcademicYearsByProgram);
router.post('/academic-years', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(createAcademicYearSchema), academicController.createAcademicYear);

// ==========================================
// SECTIONS
// ==========================================
router.get('/academic-years/:academicYearId/sections', academicController.getSectionsByAcademicYear);
router.post('/sections', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(createSectionSchema), academicController.createSection);

// ==========================================
// SUBJECTS
// ==========================================
router.get('/subjects', academicController.getAllSubjects);
router.post('/subjects', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(createSubjectSchema), academicController.createSubject);
router.put('/subjects/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), validate(updateSubjectSchema), academicController.updateSubject);
router.delete('/subjects/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'HOD'), academicController.deleteSubject);

export default router;
