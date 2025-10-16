import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { SensorType } from '../models/Device';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
    return;
  }
  next();
};

export const registerDeviceValidation = [
  body('name').trim().notEmpty().withMessage('Device name is required'),
  body('deviceType')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Device type cannot be empty'),
  body('sensors')
    .isArray({ min: 1 })
    .withMessage('At least one sensor is required'),
  body('sensors.*.type')
    .isIn(Object.values(SensorType))
    .withMessage('Invalid sensor type'),
  body('sensors.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('location.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location name cannot be empty'),
  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
];

export const updateConfigValidation = [
  param('deviceId').trim().notEmpty().withMessage('Device ID is required'),
  body('config').isObject().withMessage('Config must be an object'),
];

export const deviceIdValidation = [
  param('deviceId').trim().notEmpty().withMessage('Device ID is required'),
];
