import { checkDatabaseConnection } from '../lib/prisma.js';
import { checkRedisConnection } from '../lib/redis.js';

class HealthService {
  async getHealthStatus() {
    const startTime = Date.now();

    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

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
          ...(dbStatus.error && { error: dbStatus.error }),
        },
        cache: {
          type: 'Redis',
          status: redisStatus.isConnected ? 'connected' : 'disconnected',
          ...(redisStatus.error && { error: redisStatus.error }),
        },
      },
    };
  }
}

export default new HealthService();
