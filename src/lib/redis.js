import Redis from 'ioredis';
import logger from './logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    if (times > 5) {
      logger.warn('Redis retry limit exceeded. Redis operations will fail gracefully.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 1000, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY error
    }
    return false;
  },
});

let isConnected = false;

redis.on('connect', () => {
  isConnected = true;
  logger.info('Connected to Redis server');
});

redis.on('ready', () => {
  isConnected = true;
  logger.info('Redis client is ready');
});

redis.on('error', (err) => {
  isConnected = false;
  logger.warn(`Redis connection warning: ${err.message}`);
});

redis.on('close', () => {
  isConnected = false;
  logger.warn('Redis connection closed');
});

/**
 * Health check helper for Redis
 */
export const checkRedisConnection = async () => {
  try {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => {});
    }
    const pong = await redis.ping();
    return { isConnected: pong === 'PONG', message: 'Redis is operational' };
  } catch (error) {
    return { isConnected: false, error: error.message };
  }
};

/**
 * Helper to get a key safely
 */
export const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn(`Redis getCache failed for key ${key}: ${error.message}`);
    return null;
  }
};

/**
 * Helper to set a key with TTL (seconds)
 */
export const setCache = async (key, value, ttlSeconds = 60) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    logger.warn(`Redis setCache failed for key ${key}: ${error.message}`);
    return false;
  }
};

/**
 * Helper to delete a key
 */
export const deleteCache = async (key) => {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn(`Redis deleteCache failed for key ${key}: ${error.message}`);
    return false;
  }
};
