/**
 * Startup Environment Validation
 *
 * Validates required environment variables before the server starts.
 * Fails fast if critical configuration is missing or uses unsafe defaults in production.
 *
 * Call this function early in server.js before establishing any connections.
 */

const KNOWN_DEV_SECRETS = new Set([
  'dev_access_fallback_secret_32_chars_min',
  'dev_refresh_fallback_secret_32_chars_min',
  'dev_super_secret_access_key_replace_in_production_123456',
  'dev_super_secret_refresh_key_replace_in_production_123456',
  'your_jwt_access_secret_key_minimum_32_characters_long',
  'your_jwt_refresh_secret_key_minimum_32_characters_long',
]);

/**
 * @throws {Error} if a required env var is missing or unsafe in production
 */
export const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  // ─── Required in all environments ───
  const required = ['DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[Config] Missing required environment variable: ${key}`);
    }
  }

  // ─── Production-only checks ───
  if (isProduction) {
    const productionRequired = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'REDIS_URL',
      'CORS_ORIGIN',
    ];

    for (const key of productionRequired) {
      if (!process.env[key]) {
        throw new Error(`[Security] Missing required production environment variable: ${key}`);
      }
    }

    // Prevent known dev/example secrets from being used in production
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const value = process.env[key];
      if (value && KNOWN_DEV_SECRETS.has(value)) {
        throw new Error(
          `[Security] ${key} is set to a known development default. ` +
          'Use a strong, randomly-generated secret in production.'
        );
      }
      if (value && value.length < 32) {
        throw new Error(`[Security] ${key} must be at least 32 characters long.`);
      }
    }

    // Warn about CORS wildcard in production
    const corsOrigin = process.env.CORS_ORIGIN || '';
    if (corsOrigin === '*' || corsOrigin.split(',').includes('*')) {
      // Not a hard fail — but very insecure. Log forcefully.
      console.error(
        '[Security WARNING] CORS_ORIGIN is set to wildcard (*) in production. ' +
        'This prevents browser credential sharing and may expose your API. ' +
        'Set explicit frontend origin(s).'
      );
    }
  }
};
