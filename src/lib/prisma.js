import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

// Test connection helper
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { isConnected: true, message: 'Database connected successfully' };
  } catch (error) {
    logger.error('PostgreSQL connection check failed', error.message);
    return { isConnected: false, error: error.message };
  }
};
