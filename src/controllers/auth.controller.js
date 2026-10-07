import authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';

/**
 * Controller: User Login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.login({
      email,
      password,
      ipAddress,
      userAgent,
    });

    return successResponse(res, 200, 'Authentication successful', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Refresh Access Token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const tokens = await authService.refreshAccessToken({
      refreshTokenString: refreshToken,
      ipAddress,
      userAgent,
    });

    return successResponse(res, 200, 'Token refreshed successfully', tokens);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Logout
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.logout({
      refreshTokenString: refreshToken,
      userId,
      ipAddress,
      userAgent,
    });

    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Change Password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.changePassword({
      userId,
      currentPassword,
      newPassword,
      ipAddress,
      userAgent,
    });

    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Authenticated User Profile
 */
export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await authService.getProfile(userId);

    return successResponse(res, 200, 'User profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Forgot Password Request
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.forgotPassword({ email, ipAddress, userAgent });
    return successResponse(res, 200, result.message, {
      ...(result.resetToken && { resetToken: result.resetToken }),
      ...(result.expiresAt && { expiresAt: result.expiresAt }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Reset Password Confirm
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.resetPassword({ token, newPassword, ipAddress, userAgent });
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

