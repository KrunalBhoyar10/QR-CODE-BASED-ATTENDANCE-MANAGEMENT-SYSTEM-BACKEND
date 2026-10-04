import { z } from 'zod';

// Department validation
export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Department name must be at least 2 characters'),
    code: z
      .string()
      .trim()
      .min(2, 'Department code must be at least 2 characters')
      .max(10, 'Department code cannot exceed 10 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Department code must be alphanumeric with hyphens or underscores'),
    description: z.string().optional(),
    hodId: z.string().uuid('Invalid HOD user ID').optional().nullable(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid department ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    description: z.string().optional(),
    hodId: z.string().uuid().optional().nullable(),
  }),
});

// Program validation
export const createProgramSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Program name is required'),
    code: z.string().trim().min(2, 'Program code is required').max(10),
    departmentId: z.string().uuid('Invalid department ID'),
    durationYears: z.number().int().min(1).max(6).default(3),
  }),
});

export const updateProgramSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid program ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).max(10).optional(),
    durationYears: z.number().int().min(1).max(6).optional(),
  }),
});

// Academic Year validation
export const createAcademicYearSchema = z.object({
  body: z.object({
    programId: z.string().uuid('Invalid program ID'),
    yearNumber: z.number().int().min(1).max(6),
    label: z.string().trim().min(1, 'Label is required (e.g. "1st Year")'),
  }),
});

// Section validation
export const createSectionSchema = z.object({
  body: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID'),
    name: z.string().trim().min(1).max(10, 'Section name e.g. "A", "B", "Alpha"'),
    capacity: z.number().int().positive().optional().nullable(),
  }),
});

// Subject validation
export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Subject name is required'),
    code: z.string().trim().min(2, 'Subject code is required').max(20),
    credits: z.number().int().positive().optional().nullable(),
    departmentId: z.string().uuid('Invalid department ID'),
    programId: z.string().uuid('Invalid program ID'),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subject ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).max(20).optional(),
    credits: z.number().int().positive().optional().nullable(),
  }),
});
