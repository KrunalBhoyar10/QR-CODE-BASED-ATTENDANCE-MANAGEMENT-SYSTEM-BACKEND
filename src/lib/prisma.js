import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// ── Keep-alive ping for Neon serverless (drops idle connections after ~5 min) ─
// Ping every 4 minutes to keep the connection pool alive.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

let keepAliveTimer = null;

export const startKeepAlive = () => {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      logger.warn('[Prisma keep-alive] ping failed, connection may have dropped:', err.message);
      // Attempt to reconnect by disconnecting and letting Prisma auto-reconnect on next query
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        logger.info('[Prisma keep-alive] reconnected successfully');
      } catch (reconnectErr) {
        logger.error('[Prisma keep-alive] reconnect failed:', reconnectErr.message);
      }
    }
  }, KEEPALIVE_INTERVAL_MS);
  // Don't block process exit
  if (keepAliveTimer.unref) keepAliveTimer.unref();
};

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
