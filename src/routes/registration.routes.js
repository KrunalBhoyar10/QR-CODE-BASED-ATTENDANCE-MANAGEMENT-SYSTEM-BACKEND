import { Router } from 'express';
import * as registrationController from '../controllers/registration.controller.js';
import validate from '../middleware/validate.middleware.js';
import { studentRegistrationSchema } from '../validators/registration.validator.js';

const router = Router();

/**
 * All routes below are PUBLIC — no authenticateJwt middleware.
 * They exist only to support the student self-registration flow.
 * Read-only GET routes return limited, non-sensitive academic structure data.
 */

// ── Dropdown data for the registration form ──────────────────────────────────

/** GET /api/v1/register/programs */
router.get('/programs', registrationController.getPrograms);

/** GET /api/v1/register/programs/:programId/academic-years */
router.get('/programs/:programId/academic-years', registrationController.getAcademicYears);

/** GET /api/v1/register/academic-years/:academicYearId/sections */
router.get('/academic-years/:academicYearId/sections', registrationController.getSections);

/** GET /api/v1/register/sections/:sectionId/subjects */
router.get('/sections/:sectionId/subjects', registrationController.getSubjects);

// ── Student self-registration ─────────────────────────────────────────────────

/** POST /api/v1/register/student */
router.post(
  '/student',
  validate(studentRegistrationSchema),
  registrationController.registerStudent
);

export default router;
