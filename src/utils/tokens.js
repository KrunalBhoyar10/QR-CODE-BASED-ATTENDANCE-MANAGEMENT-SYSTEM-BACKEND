import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_fallback_secret_32_chars_min';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_fallback_secret_32_chars_min';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate Access Token
 * @param {object} payload - { id, email, role, teacherId, studentId, departmentId }
 * @returns {string}
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  });
};

/**
 * Verify Access Token
 * @param {string} token
 * @returns {object}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

/**
 * Generate Refresh Token
 * @param {object} payload - { id }
 * @returns {string}
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  });
};

/**
 * Verify Refresh Token
 * @param {string} token
 * @returns {object}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

/**
 * Hash a token for secure database storage using SHA-256
 * @param {string} token
 * @returns {string}
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate cryptographically secure random string
 * @param {number} bytes
 * @returns {string}
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};
