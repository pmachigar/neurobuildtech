const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { requireRole } = require('../middleware/auth');
const { validate, validatePagination } = require('../middleware/validation');
const { 
  registerDeviceSchema, 
  updateDeviceSchema, 
  bulkDeviceSchema 
} = require('../schemas/device.schema');

/**
 * @route   GET /api/v1/devices
 * @desc    List all devices with filtering and pagination
 * @access  Private (User, Admin)
 */
router.get('/', 
  validatePagination,
  deviceController.listDevices
);

/**
 * @route   POST /api/v1/devices
 * @desc    Register new device
 * @access  Private (Admin only)
 */
router.post('/', 
  requireRole('admin'),
  validate(registerDeviceSchema),
  deviceController.registerDevice
);

/**
 * @route   GET /api/v1/devices/:id
 * @desc    Get device details
 * @access  Private (User, Admin)
 */
router.get('/:id', 
  deviceController.getDevice
);

/**
 * @route   PUT /api/v1/devices/:id
 * @desc    Update device configuration
 * @access  Private (Admin only)
 */
router.put('/:id', 
  requireRole('admin'),
  validate(updateDeviceSchema),
  deviceController.updateDevice
);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    Deactivate device
 * @access  Private (Admin only)
 */
router.delete('/:id', 
  requireRole('admin'),
  deviceController.deactivateDevice
);

/**
 * @route   GET /api/v1/devices/:id/status
 * @desc    Get device status and health
 * @access  Private (User, Admin, Device)
 */
router.get('/:id/status', 
  deviceController.getDeviceStatus
);

/**
 * @route   POST /api/v1/devices/bulk
 * @desc    Bulk device operations
 * @access  Private (Admin only)
 */
router.post('/bulk', 
  requireRole('admin'),
  validate(bulkDeviceSchema),
  deviceController.bulkDeviceOperations
);

module.exports = router;
