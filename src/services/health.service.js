import { checkDatabaseConnection } from '../lib/prisma.js';
import { checkRedisConnection } from '../lib/redis.js';
import logger from '../lib/logger.js';

class HealthService {
  async getHealthStatus() {
    const startTime = Date.now();

    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

    // Log any errors server-side but do NOT expose internal error details in the API response.
    if (!dbStatus.isConnected && dbStatus.error) {
      logger.error('[Health] PostgreSQL connection failed', dbStatus.error);
    }
    if (!redisStatus.isConnected && redisStatus.error) {
      logger.warn('[Health] Redis connection failed', redisStatus.error);
    }

    const isHealthy = dbStatus.isConnected;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      responseTimeMs: Date.now() - startTime,
      services: {
        database: {
          type: 'PostgreSQL',
          status: dbStatus.isConnected ? 'connected' : 'disconnected',
          // Do NOT expose raw error messages in production (may reveal internal details)
          ...(process.env.NODE_ENV !== 'production' && dbStatus.error && { error: dbStatus.error }),
        },
        cache: {
          type: 'Redis',
          status: redisStatus.isConnected ? 'connected' : 'disconnected',
          ...(process.env.NODE_ENV !== 'production' && redisStatus.error && { error: redisStatus.error }),
        },
      },
    };
  }
}

export default new HealthService();
