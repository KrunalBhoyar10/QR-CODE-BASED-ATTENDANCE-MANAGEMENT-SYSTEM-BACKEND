import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.js';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

/**
 * Standard API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many requests from this IP, please try again later');
  },
});

/**
 * Stricter rate limiter for authentication endpoints (prevent brute-force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many authentication attempts, please try again after 15 minutes');
  },
});
