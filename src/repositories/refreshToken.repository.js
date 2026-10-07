import { prisma } from '../lib/prisma.js';

class RefreshTokenRepository {
  async create({ tokenHash, userId, expiresAt, ipAddress, userAgent }) {
    return prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  async findByTokenHash(tokenHash) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            teacher: true,
            student: true,
            headedDepartment: true,
          },
        },
      },
    });
  }

  async revokeToken(id, replacedByToken = null) {
    return prisma.refreshToken.update({
      where: { id },
      data: {
        isRevoked: true,
        ...(replacedByToken && { replacedByToken }),
      },
    });
  }

  async revokeAllUserTokens(userId) {
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // Alias: some services call this as revokeAllForUser
  async revokeAllForUser(userId) {
    return this.revokeAllUserTokens(userId);
  }

  async deleteExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

export default new RefreshTokenRepository();
