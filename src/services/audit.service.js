import auditLogRepository from '../repositories/auditLog.repository.js';

/**
 * Centralized Audit Logging Service
 *
 * Accepts EITHER a `req` object (Express request) OR explicit `ipAddress`/`userAgent`
 * strings. This handles both call patterns used across the codebase:
 *   - auditService.log({ ..., req })
 *   - auditService.log({ ..., ipAddress, userAgent })
 */
class AuditService {
  async log({ userId, action, entity, entityId, details, req, ipAddress: rawIp, userAgent: rawUa }) {
    // Prefer values from the Express request object if provided
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || rawIp || null;
    const userAgent = req?.headers?.['user-agent'] || rawUa || null;

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
