const Joi = require('joi');

/**
 * Schema for sensor data query
 */
const sensorDataQuerySchema = Joi.object({
  device_id: Joi.string().uuid().optional(),
  sensor_type: Joi.string().valid('ld2410', 'pir', 'mq134').optional(),
  start_time: Joi.date().iso().optional(),
  end_time: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  page: Joi.number().integer().min(1).default(1)
});

/**
 * Schema for aggregated data query
 */
const aggregatedDataQuerySchema = Joi.object({
  device_id: Joi.string().uuid().optional(),
  sensor_type: Joi.string().valid('ld2410', 'pir', 'mq134').optional(),
  aggregation: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'monthly')
    .required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().required(),
  metrics: Joi.array()
    .items(Joi.string().valid('avg', 'min', 'max', 'count', 'sum'))
    .default(['avg'])
});

/**
 * Schema for sensor data submission (for devices)
 */
const sensorDataSubmissionSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  timestamp: Joi.date().iso().default(() => new Date()),
  readings: Joi.array().items(
    Joi.object({
      sensor_type: Joi.string().valid('ld2410', 'pir', 'mq134').required(),
      values: Joi.object({
        // LD2410 radar sensor
        presence: Joi.boolean(),
        moving_distance: Joi.number().min(0).max(600),
        static_distance: Joi.number().min(0).max(600),
        moving_energy: Joi.number().min(0).max(100),
        static_energy: Joi.number().min(0).max(100),
        
        // PIR motion sensor
        motion_detected: Joi.boolean(),
        motion_count: Joi.number().integer().min(0),
        
        // MQ134 gas sensor
        gas_concentration: Joi.number().min(0),
        gas_type: Joi.string(),
        ppm: Joi.number().min(0)
      }).required(),
      unit: Joi.string().optional(),
      quality: Joi.string().valid('good', 'fair', 'poor').default('good')
    })
  ).min(1).required()
});

module.exports = {
  sensorDataQuerySchema,
  aggregatedDataQuerySchema,
  sensorDataSubmissionSchema
};
