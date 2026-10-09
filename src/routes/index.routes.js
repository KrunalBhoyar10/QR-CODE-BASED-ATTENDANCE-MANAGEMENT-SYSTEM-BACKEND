import { Router } from 'express';
import authRoutes from './auth.routes.js';
import academicRoutes from './academic.routes.js';
import principalRoutes from './principal.routes.js';
import hodRoutes from './hod.routes.js';
import teacherRoutes from './teacher.routes.js';
import studentRoutes from './student.routes.js';
import registrationRoutes from './registration.routes.js';

const router = Router();

// Mount core module routes
router.use('/auth', authRoutes);
router.use('/academic', academicRoutes);
router.use('/principal', principalRoutes);
router.use('/hod', hodRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

// Public student self-registration (no auth required)
router.use('/register', registrationRoutes);

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
