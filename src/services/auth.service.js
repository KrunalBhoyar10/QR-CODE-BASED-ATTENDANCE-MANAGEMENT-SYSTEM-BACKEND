import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import auditService from './audit.service.js';
import { hashPassword, comparePassword } from '../utils/passwords.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/tokens.js';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

class AuthService {
  /**
   * User login
   */
  async login({ email, password, ipAddress, userAgent }) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated. Please contact administrator.');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Token payloads
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      teacherId: user.teacher?.id || null,
      studentId: user.student?.id || null,
      departmentId: user.teacher?.departmentId || user.student?.departmentId || user.headedDepartment?.id || null,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store hashed refresh token in PostgreSQL (7 days expiration)
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Audit log
    await auditService.log({
      userId: user.id,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { role: user.role },
      req: { ip: ipAddress, headers: { 'user-agent': userAgent } },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        teacherId: user.teacher?.id || null,
        studentId: user.student?.id || null,
        departmentId: user.teacher?.departmentId || user.student?.departmentId || user.headedDepartment?.id || null,
      },
    };
  }

  /**
   * Refresh Token with rotation and reuse detection
   */
  async refreshAccessToken({ refreshTokenString, ipAddress, userAgent }) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenString);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshTokenString);
    const savedTokenRecord = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!savedTokenRecord) {
      throw new UnauthorizedError('Refresh token not found');
    }

    // Reuse detection
    if (savedTokenRecord.isRevoked) {
      await refreshTokenRepository.revokeAllUserTokens(savedTokenRecord.userId);
      throw new UnauthorizedError('Token reuse detected. All sessions revoked for security.');
    }

    if (new Date() > new Date(savedTokenRecord.expiresAt)) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    const user = savedTokenRecord.user;
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account deactivated or not found');
    }

    // Generate new token pair (Token Rotation)
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      teacherId: user.teacher?.id || null,
      studentId: user.student?.id || null,
      departmentId: user.teacher?.departmentId || user.student?.departmentId || user.headedDepartment?.id || null,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user.id });

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    const newTokenHash = hashToken(newRefreshToken);

    await refreshTokenRepository.revokeToken(savedTokenRecord.id, newRefreshToken.substring(0, 10) + '...');
    await refreshTokenRepository.create({
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt: newExpiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout (Revoke refresh token)
   */
  async logout({ refreshTokenString, userId, ipAddress, userAgent }) {
    if (refreshTokenString) {
      const tokenHash = hashToken(refreshTokenString);
      const savedToken = await refreshTokenRepository.findByTokenHash(tokenHash);
      if (savedToken) {
        await refreshTokenRepository.revokeToken(savedToken.id);
      }
    } else if (userId) {
      await refreshTokenRepository.revokeAllUserTokens(userId);
    }

    if (userId) {
      await auditService.log({
        userId,
        action: 'AUTH_LOGOUT',
        entity: 'User',
        entityId: userId,
        details: {},
        req: { ip: ipAddress, headers: { 'user-agent': userAgent } },
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Change user password
   */
  async changePassword({ userId, currentPassword, newPassword, ipAddress, userAgent }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, newPasswordHash);

    // Invalidate all active refresh tokens on password change
    await refreshTokenRepository.revokeAllUserTokens(userId);

    await auditService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      details: {},
      req: { ip: ipAddress, headers: { 'user-agent': userAgent } },
    });

    return { message: 'Password changed successfully. Please log in again with your new password.' };
  }

  /**
   * Get current authenticated user profile
   */
  async getProfile(userId) {
    const user = await userRepository.findByIdWithProfiles(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      teacherProfile: user.teacher || null,
      studentProfile: user.student || null,
      headedDepartment: user.headedDepartment || null,
    };
  }
}

export default new AuthService();
