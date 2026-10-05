import { Router } from 'express';
import authRoutes from './auth.routes.js';
import academicRoutes from './academic.routes.js';
import principalRoutes from './principal.routes.js';
import hodRoutes from './hod.routes.js';

const router = Router();

// Mount core module routes
router.use('/auth', authRoutes);
router.use('/academic', academicRoutes);
router.use('/principal', principalRoutes);
router.use('/hod', hodRoutes);

// Base route info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'QR Code Attendance Management System API v1',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

export default router;
