import 'dotenv/config';
import app from './app.js';
import logger from './lib/logger.js';
import { checkDatabaseConnection, prisma } from './lib/prisma.js';
import { checkRedisConnection, redis } from './lib/redis.js';
import { validateEnv } from './utils/validateEnv.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  // Validate all required environment variables before starting
  validateEnv();

  logger.info('Initializing QR Code Attendance Backend System...');

  // Database connectivity check
  const dbHealth = await checkDatabaseConnection();
  if (dbHealth.isConnected) {
    logger.info('Database (PostgreSQL) connected and verified.');
  } else {
    logger.warn(`Database (PostgreSQL) is currently unreachable: ${dbHealth.error || 'Connection error'}`);
  }

  // Redis connectivity check
  const redisHealth = await checkRedisConnection();
  if (redisHealth.isConnected) {
    logger.info('Cache & Session store (Redis) connected and verified.');
  } else {
    logger.warn(`Redis is currently unreachable: ${redisHealth.error || 'Connection error'}. Temporary session operations will fallback or wait for reconnection.`);
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server successfully running on port ${PORT} [Env: ${process.env.NODE_ENV || 'development'}]`);
    logger.info(`Health check available at: http://localhost:${PORT}/health`);
    logger.info(`API endpoints available at: http://localhost:${PORT}/api/v1`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed.');

      try {
        await prisma.$disconnect();
        logger.info('PostgreSQL connection closed.');
      } catch (err) {
        logger.error('Error disconnecting PostgreSQL', err.message);
      }

      try {
        if (redis.status === 'ready' || redis.status === 'connect') {
          await redis.quit();
          logger.info('Redis connection closed.');
        }
      } catch (err) {
        logger.error('Error disconnecting Redis', err.message);
      }

      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.error('Fatal error during application startup', error);
  process.exit(1);
});
