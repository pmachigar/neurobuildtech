const Joi = require('joi');

/**
 * Schema for device registration
 */
const registerDeviceSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .description('Device name'),
  
  type: Joi.string()
    .valid('sensor_hub', 'gateway', 'standalone')
    .required()
    .description('Device type'),
  
  location: Joi.object({
    building: Joi.string().max(100),
    floor: Joi.string().max(50),
    room: Joi.string().max(50),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    })
  }).optional(),
  
  sensors: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('ld2410', 'pir', 'mq134').required(),
      model: Joi.string().max(50),
      pin: Joi.string().max(20)
    })
  ).optional(),
  
  config: Joi.object({
    sampling_rate: Joi.number().min(1).max(3600),
    transmission_interval: Joi.number().min(1).max(3600),
    power_mode: Joi.string().valid('low', 'normal', 'high')
  }).optional(),
  
  metadata: Joi.object().optional()
});

/**
 * Schema for device update
 */
const updateDeviceSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .optional(),
  
  location: Joi.object({
    building: Joi.string().max(100),
    floor: Joi.string().max(50),
    room: Joi.string().max(50),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    })
  }).optional(),
  
  config: Joi.object({
    sampling_rate: Joi.number().min(1).max(3600),
    transmission_interval: Joi.number().min(1).max(3600),
    power_mode: Joi.string().valid('low', 'normal', 'high')
  }).optional(),
  
  metadata: Joi.object().optional()
}).min(1); // At least one field must be provided

/**
 * Schema for bulk device operations
 */
const bulkDeviceSchema = Joi.object({
  operation: Joi.string()
    .valid('activate', 'deactivate', 'delete', 'update_config')
    .required(),
  
  device_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required(),
  
  config: Joi.object().optional()
});

/**
 * Schema for device query filters
 */
const deviceQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'maintenance'),
  type: Joi.string().valid('sensor_hub', 'gateway', 'standalone'),
  location: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  registerDeviceSchema,
  updateDeviceSchema,
  bulkDeviceSchema,
  deviceQuerySchema
};
