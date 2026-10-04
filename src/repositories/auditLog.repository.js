import { prisma } from '../lib/prisma.js';
import logger from '../lib/logger.js';

class AuditLogRepository {
  async createLog({ userId, action, entity, entityId, details, ipAddress, userAgent }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          entity,
          entityId: entityId ? String(entityId) : null,
          details: details || {},
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (error) {
      logger.error('Failed to create audit log in PostgreSQL', error.message);
      return null;
    }
  }

  async findLogsByUser(userId, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export default new AuditLogRepository();
