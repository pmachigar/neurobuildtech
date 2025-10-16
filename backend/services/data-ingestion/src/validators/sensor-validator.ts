import Joi from 'joi';
import { SensorReading } from '../types';

const ld2410Schema = Joi.object({
  presence: Joi.boolean().required(),
  distance: Joi.number().min(0).max(600).required(),
  energy: Joi.number().min(0).max(100).required(),
});

const pirSchema = Joi.object({
  motion_detected: Joi.boolean().required(),
});

const mq134Schema = Joi.object({
  gas_concentration: Joi.number().min(0).required(),
  unit: Joi.string().valid('ppm', 'ppb').required(),
});

const sensorDataSchema = Joi.object({
  ld2410: ld2410Schema.optional(),
  pir: pirSchema.optional(),
  mq134: mq134Schema.optional(),
}).min(1);

const sensorReadingSchema = Joi.object({
  device_id: Joi.string().required(),
  timestamp: Joi.string().isoDate().required(),
  sensors: sensorDataSchema.required(),
});

export class SensorValidator {
  validate(data: unknown): { valid: boolean; data?: SensorReading; error?: string } {
    const { error, value } = sensorReadingSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return {
        valid: false,
        error: error.details.map((d) => d.message).join(', '),
      };
    }

    return {
      valid: true,
      data: value as SensorReading,
    };
  }

  validateDeviceId(deviceId: string): boolean {
    return /^[a-zA-Z0-9-_]+$/.test(deviceId);
  }

  validateTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }
}

export const sensorValidator = new SensorValidator();
