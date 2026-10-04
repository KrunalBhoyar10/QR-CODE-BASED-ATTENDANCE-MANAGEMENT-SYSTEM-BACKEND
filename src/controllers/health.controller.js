import healthService from '../services/health.service.js';
import { successResponse } from '../utils/response.js';

/**
 * Health check controller
 */
export const getHealth = async (req, res, next) => {
  try {
    const health = await healthService.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return successResponse(res, statusCode, 'Service health status', health);
  } catch (error) {
    next(error);
  }
};
