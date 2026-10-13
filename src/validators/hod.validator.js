import { z } from 'zod';
import { DEFAULT_LOW_ATTENDANCE_THRESHOLD } from '../constants/attendance.constants.js';
import { orgEmailField } from '../utils/emailDomain.js';

// ─────────────────────────────────────────────────────────
// Common reusable pieces
// ─────────────────────────────────────────────────────────

const uuidParam = (label) =>
  z.object({
    params: z.object({
      id: z.string().uuid(`Invalid ${label} ID format`),
    }),
  });

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const boolQuery = z.preprocess(
  (val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  },
  z.boolean().optional()
);

// ─────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────

export const updateHodProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name cannot be empty').max(50).optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50).optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  }),
});

export const changeHodPasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
  }),
});

// ─────────────────────────────────────────────────────────
// Programs
// ─────────────────────────────────────────────────────────

export const createProgramSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Program name is required').max(100),
    code: z.string().trim().min(1, 'Program code is required').max(20),
    durationYears: z.number().int().min(1).max(10).optional().default(3),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateProgramSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid program ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    durationYears: z.number().int().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const programIdParamSchema = uuidParam('program');

// ─────────────────────────────────────────────────────────
// Academic Years
// ─────────────────────────────────────────────────────────

export const createAcademicYearSchema = z.object({
  body: z.object({
    programId: z.string().uuid('Invalid program ID format'),
    yearNumber: z.number().int().min(1, 'Year number must be at least 1').max(10),
    semesterCount: z.number().int().min(1).max(8).optional().default(2),
    label: z.string().trim().min(1).max(50).optional(),
  }),
});

export const updateAcademicYearSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid academic year ID format'),
  }),
  body: z.object({
    yearNumber: z.number().int().min(1, 'Year number must be at least 1').max(10).optional(),
    semesterCount: z.number().int().min(1).max(8).optional(),
    label: z.string().trim().min(1).max(50).optional(),
  }),
});

export const academicYearIdParamSchema = uuidParam('academic year');

export const programIdForYearsParamSchema = z.object({
  params: z.object({
    programId: z.string().uuid('Invalid program ID format'),
  }),
});

// ─────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────

export const createSectionSchema = z.object({
  body: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID format'),
    name: z.string().trim().min(1, 'Section name is required').max(10),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
    classTeacherId: z.string().uuid('Invalid teacher ID format').optional().nullable(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid section ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(10).optional(),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
    classTeacherId: z.string().uuid('Invalid teacher ID format').optional().nullable(),
  }),
});

export const sectionIdParamSchema = uuidParam('section');

export const academicYearIdForSectionsParamSchema = z.object({
  params: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID format'),
  }),
});

// ─────────────────────────────────────────────────────────
// Subjects
// ─────────────────────────────────────────────────────────

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Subject name is required').max(100),
    code: z.string().trim().min(1, 'Subject code is required').max(20),
    credits: z.number().int().min(1).max(10).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    subjectType: z.enum(['COMMON', 'ELECTIVE']).optional().default('COMMON'),
    programId: z.string().uuid('Invalid program ID format'),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional().nullable(),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subject ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    credits: z.number().int().min(1).max(10).optional().nullable(),
    isActive: z.boolean().optional(),
    subjectType: z.enum(['COMMON', 'ELECTIVE']).optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional().nullable(),
  }),
});

export const subjectIdParamSchema = uuidParam('subject');

export const listSubjectsQuerySchema = z.object({
  query: z.object({
    programId: z.string().uuid('Invalid program ID format').optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
    isActive: boolQuery,
  }),
});

// ─────────────────────────────────────────────────────────
// Teachers
// ─────────────────────────────────────────────────────────

export const createTeacherSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: orgEmailField(),
    employeeId: z.string().trim().min(1, 'Employee ID is required').max(30),
    designation: z.string().trim().max(100).optional().nullable(),
    password: passwordField.optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    mustChangePassword: z.boolean().optional().default(true),
  }),
});

export const teacherIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID format'),
  }),
});

export const updateTeacherStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID format'),
  }),
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive is required' }),
    reason: z.string().trim().optional(),
  }),
});

export const resetTeacherPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID format'),
  }),
  body: z.object({
    temporaryPassword: passwordField.optional(),
  }).optional(),
});

export const listTeachersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    isActive: boolQuery,
  }),
});

// ─────────────────────────────────────────────────────────
// Teaching Assignments
// ─────────────────────────────────────────────────────────

export const createTeachingAssignmentSchema = z.object({
  body: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format'),
    subjectId: z.string().uuid('Invalid subject ID format'),
    programId: z.string().uuid('Invalid program ID format'),
    academicYearId: z.string().uuid('Invalid academic year ID format'),
    sectionId: z.string().uuid('Invalid section ID format'),
    validFrom: z.string().datetime({ message: 'validFrom must be a valid ISO datetime' }).optional(),
    validTo: z.string().datetime({ message: 'validTo must be a valid ISO datetime' }).optional(),
  }),
});

export const updateTeachingAssignmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid assignment ID format'),
  }),
  body: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    subjectId: z.string().uuid('Invalid subject ID format').optional(),
    programId: z.string().uuid('Invalid program ID format').optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
    validFrom: z.string().datetime({ message: 'validFrom must be a valid ISO datetime' }).optional(),
    validTo: z.string().datetime({ message: 'validTo must be a valid ISO datetime' }).optional(),
  }),
});

export const assignmentIdParamSchema = uuidParam('assignment');

export const updateAssignmentStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid assignment ID format'),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], { required_error: 'status is required' }),
  }),
});

export const listAssignmentsQuerySchema = z.object({
  query: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    subjectId: z.string().uuid('Invalid subject ID format').optional(),
    programId: z.string().uuid('Invalid program ID format').optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

// ─────────────────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────────────────

export const studentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid student ID format'),
  }),
});

export const listStudentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    programId: z.string().uuid('Invalid program ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
  }),
});

// ─────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────

export const hodAttendanceQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    programId: z.string().uuid('Invalid program ID format').optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
    subjectId: z.string().uuid('Invalid subject ID format').optional(),
    threshold: z.coerce.number().min(0).max(100).optional().default(DEFAULT_LOW_ATTENDANCE_THRESHOLD),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    type: z.enum(['students', 'subjects']).optional(),
  }),
});

export const studentAttendanceParamSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

// ─────────────────────────────────────────────────────────
// Programs query (for isActive filtering)
// ─────────────────────────────────────────────────────────
export const listProgramsQuerySchema = z.object({
  query: z.object({
    isActive: boolQuery,
  }),
});
