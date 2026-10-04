import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /health
 * @desc    Check system health, database, and Redis status
 * @access  Public
 */
router.get('/', getHealth);

export default router;
