import { z } from 'zod';
import { orgEmailField } from '../utils/emailDomain.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────
// 1. Profile & Password Schemas
// ─────────────────────────────────────────────────────────

export const updateStudentProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name cannot be empty').max(50).trim().optional(),
    lastName: z.string().min(1, 'Last name cannot be empty').max(50).trim().optional(),
    phoneNumber: z.string().max(20).nullable().optional(),
    avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
  }),
});

export const changeStudentPasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: orgEmailField(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
  }),
});

// ─────────────────────────────────────────────────────────
// 2. Attendance Marking Schema (Strict Server-Validated)
// ─────────────────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  body: z.object({
    sessionId: z.string().regex(UUID_REGEX, 'Valid session UUID is required'),
    sessionToken: z.string().min(1, 'Session token is required').optional(),
    token: z.string().min(1, 'Session token is required').optional(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    faceVerificationData: z.record(z.any()).optional().nullable(),
  }).refine((data) => data.sessionToken || data.token, {
    message: 'Either sessionToken or token must be provided',
    path: ['sessionToken'],
  }),
});

// ─────────────────────────────────────────────────────────
// 3. Attendance Query Schemas
// ─────────────────────────────────────────────────────────

export const attendanceHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']).optional(),
    subjectId: z.string().regex(UUID_REGEX, 'Invalid subject ID format').optional(),
  }),
});
