const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { validate, validatePagination, validateDateRange } = require('../middleware/validation');
const { deviceLimiter, queryLimiter } = require('../middleware/rateLimit');
const { 
  sensorDataQuerySchema, 
  aggregatedDataQuerySchema,
  sensorDataSubmissionSchema 
} = require('../schemas/data.schema');

/**
 * @route   GET /api/v1/data/sensors
 * @desc    Query sensor data with filters
 * @access  Private (User, Admin)
 */
router.get('/sensors', 
  queryLimiter,
  validatePagination,
  validateDateRange,
  dataController.querySensorData
);

/**
 * @route   GET /api/v1/data/devices/:id
 * @desc    Get all sensor data for a specific device
 * @access  Private (User, Admin, Device)
 */
router.get('/devices/:id', 
  queryLimiter,
  validatePagination,
  validateDateRange,
  dataController.getDeviceData
);

/**
 * @route   GET /api/v1/data/sensors/:type
 * @desc    Get data by sensor type (ld2410, pir, mq134)
 * @access  Private (User, Admin)
 */
router.get('/sensors/:type', 
  queryLimiter,
  validatePagination,
  validateDateRange,
  dataController.getSensorTypeData
);

/**
 * @route   GET /api/v1/data/aggregated
 * @desc    Get aggregated data (hourly, daily averages)
 * @access  Private (User, Admin)
 */
router.get('/aggregated', 
  queryLimiter,
  validateDateRange,
  dataController.getAggregatedData
);

/**
 * @route   GET /api/v1/data/latest
 * @desc    Get latest readings from all devices
 * @access  Private (User, Admin)
 */
router.get('/latest', 
  dataController.getLatestReadings
);

/**
 * @route   POST /api/v1/data/submit
 * @desc    Submit sensor data (for devices)
 * @access  Private (Device only with API key)
 */
router.post('/submit', 
  deviceLimiter,
  validate(sensorDataSubmissionSchema),
  dataController.submitSensorData
);

module.exports = router;
