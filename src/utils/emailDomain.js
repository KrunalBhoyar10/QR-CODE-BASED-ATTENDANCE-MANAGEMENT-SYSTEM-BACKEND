/**
 * Organization Email Domain Validation
 *
 * Reads ORGANIZATION_EMAIL_DOMAIN from environment.
 * Falls back to 'abcuniversity.edu.in' if not set.
 *
 * Usage (Zod):
 *   email: orgEmailField()
 *
 * Usage (manual):
 *   isOrgEmail('user@abcuniversity.edu.in') // true
 */

import { z } from 'zod';

/** The configured organization domain (lowercased, trimmed). */
export const ORG_DOMAIN = (
  process.env.ORGANIZATION_EMAIL_DOMAIN || 'abcuniversity.edu.in'
).toLowerCase().trim();

/**
 * Returns true if the given email ends with @<ORG_DOMAIN>.
 * @param {string} email
 */
export const isOrgEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith(`@${ORG_DOMAIN}`);
};

/**
 * Zod string schema for an organization email field.
 * Validates format AND domain.
 *
 * @param {{ required?: boolean, optional?: boolean }} opts
 */
export const orgEmailField = () =>
  z
    .string()
    .trim()
    .email('Invalid email address format')
    .refine(isOrgEmail, {
      message: `Email must belong to the organization domain (@${ORG_DOMAIN})`,
    });

/**
 * Optional variant — skips validation if value is undefined/null.
 */
export const orgEmailFieldOptional = () =>
  z
    .string()
    .trim()
    .email('Invalid email address format')
    .refine(isOrgEmail, {
      message: `Email must belong to the organization domain (@${ORG_DOMAIN})`,
    })
    .optional();
