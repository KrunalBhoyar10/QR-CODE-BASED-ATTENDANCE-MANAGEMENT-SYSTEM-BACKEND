import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import apiV1Routes from './routes/index.routes.js';
import logger from './lib/logger.js';

const app = express();

// Trust proxy for reverse proxies (Nginx, Cloudflare, Docker)
// Only trust the FIRST proxy (most setups). Adjust if using multiple hops.
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────
// Request ID Middleware (observability)
// ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ─────────────────────────────────────────────────────────
// Security Headers via Helmet
// ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// ─────────────────────────────────────────────────────────
// CORS Configuration
// In production, CORS_ORIGIN must be explicitly set.
// Wildcard (*) with credentials is not allowed by browsers and is insecure.
// ─────────────────────────────────────────────────────────
const rawOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
const allowWildcard = rawOrigins.includes('*');

if (process.env.NODE_ENV === 'production' && allowWildcard) {
  logger.warn(
    '[SECURITY] CORS_ORIGIN is set to wildcard (*) in production. ' +
    'This disables credential support in browsers. Set explicit origin(s).'
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tool requests (Postman, server-to-server) without Origin
      if (!origin) return callback(null, true);
      if (allowWildcard) return callback(null, true);
      if (rawOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  })
);

// ─────────────────────────────────────────────────────────
// Request Parsing
// JSON limit raised to 2mb to accommodate face descriptors
// and base64 thumbnails in multipart boundary data.
// ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─────────────────────────────────────────────────────────
// HTTP Logging (skip in test; use structured format in production)
// ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─────────────────────────────────────────────────────────
// Global Rate Limiter (applies to all routes below)
// ─────────────────────────────────────────────────────────
app.use(apiLimiter);

// ─────────────────────────────────────────────────────────
// Static File Serving — Face Photos
// Uploaded face photos are served from /uploads/faces/
// ─────────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.FACE_PHOTO_DIR || path.join(process.cwd(), 'uploads', 'faces');
app.use('/uploads/faces', express.static(UPLOAD_DIR));

// ─────────────────────────────────────────────────────────
// Health check endpoint (Public — unauthenticated)
// ─────────────────────────────────────────────────────────
app.use('/health', healthRoutes);

// ─────────────────────────────────────────────────────────
// API v1 Routes
// ─────────────────────────────────────────────────────────
app.use('/api/v1', apiV1Routes);

// ─────────────────────────────────────────────────────────
// Root Welcome Endpoint
// ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to QR Code Based Attendance Management System API',
    healthCheck: '/health',
    apiRoot: '/api/v1',
  });
});

// ─────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─────────────────────────────────────────────────────────
// Centralized Error Handling (must be last)
// ─────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
