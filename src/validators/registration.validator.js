import { z } from 'zod';

const DOMAIN = process.env.ORGANIZATION_EMAIL_DOMAIN || 'abcuniversity.edu.in';

export const studentRegistrationSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be at most 100 characters'),

    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .refine(
        (val) => val.endsWith(`@${DOMAIN}`),
        `Only institutional emails ending with @${DOMAIN} are accepted`
      ),

    usn: z
      .string({ required_error: 'USN is required' })
      .trim()
      .toUpperCase()
      .min(2, 'USN must be at least 2 characters')
      .max(30, 'USN must be at most 30 characters')
      .regex(/^[A-Z0-9]+$/, 'USN must contain only letters and numbers'),

    programId: z
      .string({ required_error: 'Program is required' })
      .uuid('Invalid program ID'),

    academicYearId: z
      .string({ required_error: 'Academic year is required' })
      .uuid('Invalid academic year ID'),

    sectionId: z
      .string({ required_error: 'Section is required' })
      .uuid('Invalid section ID'),

    subjectIds: z
      .array(z.string().uuid('Invalid subject ID'))
      .min(1, 'At least one subject must be selected'),

    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});
