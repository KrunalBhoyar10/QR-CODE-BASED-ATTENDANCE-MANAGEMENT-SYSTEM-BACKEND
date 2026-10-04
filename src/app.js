import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import apiV1Routes from './routes/index.routes.js';

const app = express();

// Trust proxy for reverse proxies (Nginx, Cloudflare, Docker)
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global Rate Limiter
app.use(apiLimiter);

// Health check endpoint (Public)
app.use('/health', healthRoutes);

// API v1 Routes
app.use('/api/v1', apiV1Routes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to QR Code Based Attendance Management System API',
    healthCheck: '/health',
    apiRoot: '/api/v1',
  });
});

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handling
app.use(errorHandler);

export default app;
