import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and issue JWT access and refresh tokens
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Rotate and refresh access token
 * @access  Public
 */
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token and logout
 * @access  Public / Authenticated
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset token (delivers via email in production)
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, validate(resetPasswordRequestSchema), authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset user password using token
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordConfirmSchema), authController.resetPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Authenticated
 */
router.get('/me', authenticateJwt, authController.getMe);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password and invalidate prior sessions
 * @access  Authenticated
 */
router.post('/change-password', authenticateJwt, authLimiter, validate(changePasswordSchema), authController.changePassword);

export default router;
