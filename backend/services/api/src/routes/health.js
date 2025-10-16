const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/v1/health
 * @desc    Service health check (no auth required)
 * @access  Public
 */
router.get('/', healthController.healthCheck);

/**
 * @route   GET /api/v1/metrics
 * @desc    System metrics (devices online, data rate, storage usage)
 * @access  Private (Admin only)
 */
router.get('/metrics', 
  requireRole('admin', 'user'),
  healthController.getMetrics
);

/**
 * @route   GET /api/v1/status
 * @desc    Detailed system status
 * @access  Private (Admin only)
 */
router.get('/status', 
  requireRole('admin'),
  healthController.getSystemStatus
);

module.exports = router;
