import { z } from 'zod';
import { DEFAULT_LOW_ATTENDANCE_THRESHOLD } from '../constants/attendance.constants.js';

export const createHodSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().trim().email('Invalid email address format'),
    departmentId: z.string().uuid('Invalid department ID format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    mustChangePassword: z.boolean().optional().default(true),
  }),
});

export const updateHodSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid HOD user ID format'),
  }),
  body: z.object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    email: z.string().trim().email('Invalid email address format').optional(),
    departmentId: z.string().uuid('Invalid department ID format').optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  }),
});

export const updateHodStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid HOD user ID format'),
  }),
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive status is required' }),
    reason: z.string().trim().optional(),
  }),
});

export const resetHodPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid HOD user ID format'),
  }),
  body: z.object({
    temporaryPassword: z
      .string()
      .min(8, 'Temporary password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Temporary password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Temporary password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Temporary password must contain at least one number')
      .optional(),
  }).optional(),
});

export const hodIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid HOD user ID format'),
  }),
});

export const updatePrincipalProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name cannot be empty').max(50).optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50).optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  }),
});

export const changePrincipalPasswordSchema = z.object({
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

export const listHodsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    departmentId: z.string().uuid('Invalid department ID format').optional(),
    isActive: z
      .preprocess((val) => {
        if (val === 'true' || val === true) return true;
        if (val === 'false' || val === false) return false;
        return undefined;
      }, z.boolean().optional()),
  }),
});

export const attendanceQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    departmentId: z.string().uuid('Invalid department ID format').optional(),
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

export const departmentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid department ID format'),
  }),
});

export const programIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid program ID format'),
  }),
});

export const academicYearIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid academic year ID format'),
  }),
});
