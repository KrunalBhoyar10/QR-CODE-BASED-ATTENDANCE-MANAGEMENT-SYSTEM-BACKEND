import { prisma } from '../lib/prisma.js';

class PasswordResetTokenRepository {
  /**
   * Create a new password reset token
   */
  async create({ tokenHash, userId, expiresAt }) {
    return prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Find a reset token by token hash
   */
  async findByTokenHash(tokenHash) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            student: true,
            teacher: true,
            headedDepartment: true,
          },
        },
      },
    });
  }

  /**
   * Mark token as used
   */
  async markAsUsed(id) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  /**
   * Revoke all reset tokens for a user
   */
  async revokeAllForUser(userId) {
    return prisma.passwordResetToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });
  }

  /**
   * Clean up expired tokens
   */
  async deleteExpiredTokens() {
    return prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

export default new PasswordResetTokenRepository();
