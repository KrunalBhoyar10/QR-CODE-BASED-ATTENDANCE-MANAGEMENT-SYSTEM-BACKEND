import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.middleware.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
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
router.post('/change-password', authenticateJwt, validate(changePasswordSchema), authController.changePassword);

export default router;
