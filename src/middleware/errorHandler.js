import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import logger from '../lib/logger.js';

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error with context
  if (statusCode >= 500) {
    logger.error(`[Unhandled/500 Error] ${req.method} ${req.originalUrl}: ${err.message}`, err.stack);
  } else {
    logger.warn(`[Client Error] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
  }

  // Handle JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Handle Prisma Database Errors securely without leaking DB internals
  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target ? ` on field (${err.meta.target})` : '';
    message = `A record with this unique value already exists${target}`;
    details = err.meta?.target || null;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Requested record not found';
  } else if (err.code?.startsWith('P')) {
    statusCode = 400;
    message = 'Database operation failed with invalid parameters';
    details = process.env.NODE_ENV === 'development' ? err.message : null;
  }

  // Sanitize message in production for 500 errors
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected server error occurred. Please try again later.';
    details = null;
  }

  return errorResponse(res, statusCode, message, {
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Catch-All Middleware
 */
export const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
};
