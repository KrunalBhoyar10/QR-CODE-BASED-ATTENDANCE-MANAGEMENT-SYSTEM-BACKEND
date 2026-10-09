import { z } from 'zod';

// ─────────────────────────────────────────────────────────
// Common reusable helpers
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

// ─────────────────────────────────────────────────────────
// Profile & Password
// ─────────────────────────────────────────────────────────

export const updateTeacherProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name cannot be empty').max(50).optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50).optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
    designation: z.string().trim().min(1).max(100).optional().nullable(),
  }),
});

export const changeTeacherPasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordField,
      confirmPassword: z.string().min(1, 'Confirm password is required').optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword !== undefined && data.newPassword !== data.confirmPassword) {
          return false;
        }
        return true;
      },
      {
        message: 'New password and confirm password do not match',
        path: ['confirmPassword'],
      }
    ),
});

// ─────────────────────────────────────────────────────────
// Teaching Assignments
// ─────────────────────────────────────────────────────────

export const listAssignmentsQuerySchema = z.object({
  query: z.object({
    programId: z.string().uuid('Invalid program ID format').optional(),
    academicYearId: z.string().uuid('Invalid academic year ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
    subjectId: z.string().uuid('Invalid subject ID format').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const assignmentIdParamSchema = uuidParam('teaching assignment');

// Sub-resource helpers
export const programIdForYearsParamSchema = z.object({
  params: z.object({
    programId: z.string().uuid('Invalid program ID format'),
  }),
});

export const academicYearIdForSectionsParamSchema = z.object({
  params: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID format'),
  }),
});

// ─────────────────────────────────────────────────────────
// Attendance Sessions
// ─────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  body: z.object({
    teachingAssignmentId: z.string().uuid('Invalid teaching assignment ID format'),
    duration: z.coerce.number().int().min(1).max(86400).optional(),
    durationSeconds: z.coerce.number().int().min(1).max(86400).optional(),
    durationMinutes: z.coerce.number().int().min(1).max(720).optional(),
    sessionDate: z.string().optional().nullable(),
    startTime: z.string().optional().nullable(),
    allowedRadius: z.coerce.number().min(5, 'Allowed radius must be at least 5 meters').max(50000).optional().default(50),
    latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90').optional().nullable(),
    longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180').optional().nullable(),
    faceVerificationRequired: z.boolean().optional().default(false),
    sessionType: z.enum(['REGULAR', 'LAB', 'EXTRA', 'TUTORIAL']).optional().default('REGULAR'),
    allowLateScan: z.boolean().optional().default(false),
  }),
});

export const sessionIdParamSchema = uuidParam('attendance session');

export const listSessionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
    assignmentId: z.string().uuid('Invalid assignment ID format').optional(),
    subjectId: z.string().uuid('Invalid subject ID format').optional(),
    sectionId: z.string().uuid('Invalid section ID format').optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  }),
});

export const sessionAttendanceQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']).optional(),
    search: z.string().trim().optional(),
  }),
});
