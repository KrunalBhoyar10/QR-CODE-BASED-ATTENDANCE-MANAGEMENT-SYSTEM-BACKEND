import auditLogRepository from '../repositories/auditLog.repository.js';

class AuditService {
  async log({ userId, action, entity, entityId, details, req }) {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    return auditLogRepository.createLog({
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      userAgent,
    });
  }
}

export default new AuditService();
