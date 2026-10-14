import { Router } from 'express';
import * as hodController from '../controllers/hod.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import {
  // Profile & Password
  updateHodProfileSchema,
  changeHodPasswordSchema,
  // Programs
  createProgramSchema,
  updateProgramSchema,
  programIdParamSchema,
  listProgramsQuerySchema,
  // Academic Years
  createAcademicYearSchema,
  updateAcademicYearSchema,
  academicYearIdParamSchema,
  programIdForYearsParamSchema,
  // Sections
  createSectionSchema,
  updateSectionSchema,
  sectionIdParamSchema,
  academicYearIdForSectionsParamSchema,
  // Subjects
  createSubjectSchema,
  updateSubjectSchema,
  subjectIdParamSchema,
  listSubjectsQuerySchema,
  // Teachers
  createTeacherSchema,
  teacherIdParamSchema,
  updateTeacherStatusSchema,
  resetTeacherPasswordSchema,
  listTeachersQuerySchema,
  // Teaching Assignments
  createTeachingAssignmentSchema,
  assignmentIdParamSchema,
  updateTeachingAssignmentSchema,
  updateAssignmentStatusSchema,
  listAssignmentsQuerySchema,
  // Students
  studentIdParamSchema,
  listStudentsQuerySchema,
  // Attendance
  hodAttendanceQuerySchema,
  studentAttendanceParamSchema,
} from '../validators/hod.validator.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// All HOD routes require authentication + HOD role
// ─────────────────────────────────────────────────────────
router.use(authenticateJwt);
router.use(authorizeRoles('HOD'));

// ============================================================
// 0. DEPARTMENT HIERARCHY
// ============================================================
router.get('/my-department', hodController.getMyDepartment);
router.get('/departments', hodController.listDepartments);
router.get('/departments/:departmentId/programs', hodController.getDepartmentPrograms);

// ============================================================
// 1. HOD PROFILE & PASSWORD
// ============================================================
router.get('/profile', hodController.getProfile);
router.patch('/profile', validate(updateHodProfileSchema), hodController.updateProfile);
router.post('/change-password', validate(changeHodPasswordSchema), hodController.changePassword);

// ============================================================
// 2. PROGRAM MANAGEMENT
// ============================================================
router.get('/programs', validate(listProgramsQuerySchema), hodController.listPrograms);
router.post('/programs', validate(createProgramSchema), hodController.createProgram);
router.get('/programs/:id', validate(programIdParamSchema), hodController.getProgramById);
router.patch('/programs/:id', validate(updateProgramSchema), hodController.updateProgram);
router.delete('/programs/:id', validate(programIdParamSchema), hodController.deleteProgram);

// ============================================================
// 3. ACADEMIC YEAR MANAGEMENT
// ============================================================
// List years under a specific program
router.get(
  '/programs/:programId/academic-years',
  validate(programIdForYearsParamSchema),
  hodController.listAcademicYears
);
router.post('/academic-years', validate(createAcademicYearSchema), hodController.createAcademicYear);
router.get('/academic-years/:id', validate(academicYearIdParamSchema), hodController.getAcademicYearById);
router.patch('/academic-years/:id', validate(updateAcademicYearSchema), hodController.updateAcademicYear);
router.delete('/academic-years/:id', validate(academicYearIdParamSchema), hodController.deleteAcademicYear);

// ============================================================
// 4. SECTION MANAGEMENT
// ============================================================
// List sections under a specific academic year
router.get(
  '/academic-years/:academicYearId/sections',
  validate(academicYearIdForSectionsParamSchema),
  hodController.listSections
);
router.post('/sections', validate(createSectionSchema), hodController.createSection);
router.get('/sections/:id', validate(sectionIdParamSchema), hodController.getSectionById);
router.patch('/sections/:id', validate(updateSectionSchema), hodController.updateSection);
router.delete('/sections/:id', validate(sectionIdParamSchema), hodController.deleteSection);

// ============================================================
// 5. SUBJECT MANAGEMENT
// ============================================================
router.get('/subjects', validate(listSubjectsQuerySchema), hodController.listSubjects);
router.post('/subjects', validate(createSubjectSchema), hodController.createSubject);
router.get('/subjects/:id', validate(subjectIdParamSchema), hodController.getSubjectById);
router.patch('/subjects/:id', validate(updateSubjectSchema), hodController.updateSubject);
router.delete('/subjects/:id', validate(subjectIdParamSchema), hodController.deleteSubject);

// ============================================================
// 6. TEACHER MANAGEMENT
// ============================================================
router.get('/teachers', validate(listTeachersQuerySchema), hodController.listTeachers);
router.post('/teachers', validate(createTeacherSchema), hodController.createTeacher);
router.get('/teachers/:id', validate(teacherIdParamSchema), hodController.getTeacherById);
router.patch('/teachers/:id/status', validate(updateTeacherStatusSchema), hodController.updateTeacherStatus);
router.post('/teachers/:id/reset-password', validate(resetTeacherPasswordSchema), hodController.resetTeacherPassword);
router.delete('/teachers/:id', validate(teacherIdParamSchema), hodController.deleteTeacher);

// ============================================================
// 7. TEACHING ASSIGNMENTS
// ============================================================
router.get('/teaching-assignments', validate(listAssignmentsQuerySchema), hodController.listAssignments);
router.post('/teaching-assignments', validate(createTeachingAssignmentSchema), hodController.createTeachingAssignment);
router.get('/teaching-assignments/:id', validate(assignmentIdParamSchema), hodController.getAssignmentById);
router.patch(
  '/teaching-assignments/:id/status',
  validate(updateAssignmentStatusSchema),
  hodController.updateAssignmentStatus
);
router.patch(
  '/teaching-assignments/:id',
  validate(updateTeachingAssignmentSchema),
  hodController.updateTeachingAssignment
);
router.delete(
  '/teaching-assignments/:id',
  validate(assignmentIdParamSchema),
  hodController.deleteTeachingAssignment
);


// ============================================================
// 8. STUDENT MANAGEMENT (view only)
// ============================================================
router.get('/students', validate(listStudentsQuerySchema), hodController.listStudents);
router.get('/students/:id', validate(studentIdParamSchema), hodController.getStudentById);

// ============================================================
// 9. ATTENDANCE & REPORTS
// ============================================================
router.get('/attendance/summary', validate(hodAttendanceQuerySchema), hodController.getDepartmentAttendanceSummary);
router.get('/attendance/programs', validate(hodAttendanceQuerySchema), hodController.getProgramAttendance);
router.get('/attendance/academic-years', validate(hodAttendanceQuerySchema), hodController.getAcademicYearAttendance);
router.get('/attendance/sections', validate(hodAttendanceQuerySchema), hodController.getSectionAttendance);
router.get('/attendance/subjects', validate(hodAttendanceQuerySchema), hodController.getSubjectAttendance);
router.get(
  '/attendance/students/:studentId',
  validate(studentAttendanceParamSchema),
  hodController.getStudentAttendance
);
router.get('/attendance/low-attendance', validate(hodAttendanceQuerySchema), hodController.getLowAttendance);
router.get('/reports', validate(hodAttendanceQuerySchema), hodController.getReportsSummary);
router.get(
  '/sections/:sectionId/students/attendance/:subjectId',
  hodController.getSectionStudentsSubjectAttendance
);

export default router;
