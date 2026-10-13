import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.js';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

const isDev  = () => process.env.NODE_ENV === 'development';
const isTest = () => process.env.NODE_ENV === 'test';

// Skip rate limiting entirely in development and test environments
const skipInNonProd = () => isDev() || isTest();

/**
 * Standard API rate limiter (global)
 * Applied to all routes as a baseline.
 */
export const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInNonProd,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many requests from this IP, please try again later');
  },
});

/**
 * Stricter rate limiter for authentication endpoints (prevent brute-force & credential stuffing)
 * 15 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInNonProd,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many authentication attempts, please try again after 15 minutes');
  },
});

export const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInNonProd,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many attendance marking attempts, please slow down');
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInNonProd,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many password reset attempts, please try again after 15 minutes');
  },
});

