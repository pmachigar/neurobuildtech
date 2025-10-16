import { Router } from 'express';
import * as deviceController from '../controllers/deviceController';
import { authenticateDevice } from '../middleware/auth';
import {
  registerDeviceValidation,
  updateConfigValidation,
  deviceIdValidation,
  validateRequest,
} from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/devices/register:
 *   post:
 *     summary: Register a new device
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sensors
 *             properties:
 *               name:
 *                 type: string
 *               deviceType:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *               sensors:
 *                 type: array
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Device registered successfully
 */
router.post(
  '/register',
  registerDeviceValidation,
  validateRequest,
  deviceController.registerDevice
);

/**
 * @swagger
 * /api/devices/register/bulk:
 *   post:
 *     summary: Register multiple devices
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - devices
 *             properties:
 *               devices:
 *                 type: array
 *     responses:
 *       201:
 *         description: Devices registered successfully
 */
router.post('/register/bulk', deviceController.bulkRegisterDevices);

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List all devices
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of devices
 */
router.get('/', deviceController.listDevices);

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get(
  '/:deviceId',
  deviceIdValidation,
  validateRequest,
  deviceController.getDevice
);

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   put:
 *     summary: Update device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Device updated successfully
 */
router.put(
  '/:deviceId',
  deviceIdValidation,
  validateRequest,
  deviceController.updateDevice
);

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device deleted successfully
 */
router.delete(
  '/:deviceId',
  deviceIdValidation,
  validateRequest,
  deviceController.deleteDevice
);

/**
 * @swagger
 * /api/devices/{deviceId}/config:
 *   put:
 *     summary: Update device configuration
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put(
  '/:deviceId/config',
  updateConfigValidation,
  validateRequest,
  deviceController.updateDeviceConfig
);

/**
 * @swagger
 * /api/devices/config/bulk:
 *   put:
 *     summary: Bulk update device configurations
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configurations updated successfully
 */
router.put('/config/bulk', deviceController.bulkUpdateConfig);

/**
 * @swagger
 * /api/devices/{deviceId}/config/rollback:
 *   post:
 *     summary: Rollback device configuration
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *     responses:
 *       200:
 *         description: Configuration rolled back successfully
 */
router.post(
  '/:deviceId/config/rollback',
  deviceIdValidation,
  validateRequest,
  deviceController.rollbackConfig
);

/**
 * @swagger
 * /api/devices/{deviceId}/config/history:
 *   get:
 *     summary: Get device configuration history
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration history
 */
router.get(
  '/:deviceId/config/history',
  deviceIdValidation,
  validateRequest,
  deviceController.getConfigHistory
);

/**
 * @swagger
 * /api/devices/{deviceId}/status:
 *   put:
 *     summary: Update device status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put(
  '/:deviceId/status',
  authenticateDevice,
  deviceIdValidation,
  validateRequest,
  deviceController.updateDeviceStatus
);

/**
 * @swagger
 * /api/devices/{deviceId}/health:
 *   get:
 *     summary: Device health check
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Health check successful
 */
router.get(
  '/:deviceId/health',
  authenticateDevice,
  deviceIdValidation,
  validateRequest,
  deviceController.healthCheck
);

/**
 * @swagger
 * /api/devices/{deviceId}/stats:
 *   get:
 *     summary: Get device statistics
 *     tags: [Monitoring]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device statistics
 */
router.get(
  '/:deviceId/stats',
  deviceIdValidation,
  validateRequest,
  deviceController.getDeviceStats
);

export default router;
