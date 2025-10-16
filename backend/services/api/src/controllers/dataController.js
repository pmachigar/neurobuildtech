const { v4: uuidv4 } = require('uuid');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// In-memory storage (replace with database in production)
const sensorData = [];

/**
 * Query sensor data with filters
 */
const querySensorData = asyncHandler(async (req, res) => {
  const { device_id, sensor_type, start_time, end_time } = req.query;
  const { page, limit, offset } = req.pagination;

  let filteredData = [...sensorData];

  // Apply filters
  if (device_id) {
    filteredData = filteredData.filter(d => d.device_id === device_id);
  }
  if (sensor_type) {
    filteredData = filteredData.filter(d => 
      d.readings.some(r => r.sensor_type === sensor_type)
    );
  }
  if (start_time) {
    filteredData = filteredData.filter(d => 
      new Date(d.timestamp) >= new Date(start_time)
    );
  }
  if (end_time) {
    filteredData = filteredData.filter(d => 
      new Date(d.timestamp) <= new Date(end_time)
    );
  }

  // Sort by timestamp (newest first)
  filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Pagination
  const total = filteredData.length;
  const paginatedData = filteredData.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      readings: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get all sensor data for a specific device
 */
const getDeviceData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time } = req.query;
  const { page, limit, offset } = req.pagination;

  let deviceData = sensorData.filter(d => d.device_id === id);

  if (start_time) {
    deviceData = deviceData.filter(d => 
      new Date(d.timestamp) >= new Date(start_time)
    );
  }
  if (end_time) {
    deviceData = deviceData.filter(d => 
      new Date(d.timestamp) <= new Date(end_time)
    );
  }

  // Sort by timestamp (newest first)
  deviceData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = deviceData.length;
  const paginatedData = deviceData.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      device_id: id,
      readings: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get data by sensor type
 */
const getSensorTypeData = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { start_time, end_time } = req.query;
  const { page, limit, offset } = req.pagination;

  // Validate sensor type
  const validTypes = ['ld2410', 'pir', 'mq134'];
  if (!validTypes.includes(type)) {
    throw new ApiError(400, 'INVALID_SENSOR_TYPE', 
      `Invalid sensor type. Must be one of: ${validTypes.join(', ')}`);
  }

  let filteredData = sensorData.filter(d => 
    d.readings.some(r => r.sensor_type === type)
  );

  if (start_time) {
    filteredData = filteredData.filter(d => 
      new Date(d.timestamp) >= new Date(start_time)
    );
  }
  if (end_time) {
    filteredData = filteredData.filter(d => 
      new Date(d.timestamp) <= new Date(end_time)
    );
  }

  // Extract only readings of the specified type
  const typeSpecificData = filteredData.map(d => ({
    device_id: d.device_id,
    timestamp: d.timestamp,
    readings: d.readings.filter(r => r.sensor_type === type)
  }));

  // Sort by timestamp (newest first)
  typeSpecificData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = typeSpecificData.length;
  const paginatedData = typeSpecificData.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      sensor_type: type,
      readings: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get aggregated data
 */
const getAggregatedData = asyncHandler(async (req, res) => {
  const { device_id, sensor_type, aggregation, start_time, end_time, metrics } = req.query;

  if (!aggregation || !start_time || !end_time) {
    throw new ApiError(400, 'MISSING_PARAMETERS', 
      'Required parameters: aggregation, start_time, end_time');
  }

  let filteredData = [...sensorData];

  if (device_id) {
    filteredData = filteredData.filter(d => d.device_id === device_id);
  }
  if (sensor_type) {
    filteredData = filteredData.filter(d => 
      d.readings.some(r => r.sensor_type === sensor_type)
    );
  }
  filteredData = filteredData.filter(d => {
    const timestamp = new Date(d.timestamp);
    return timestamp >= new Date(start_time) && timestamp <= new Date(end_time);
  });

  // Simplified aggregation (in production, use database aggregation)
  const aggregatedResult = {
    aggregation_type: aggregation,
    period: {
      start: start_time,
      end: end_time
    },
    data_points: filteredData.length,
    summary: {
      message: 'Aggregation performed successfully',
      note: 'In production, this would provide detailed statistical aggregations'
    }
  };

  res.json({
    success: true,
    data: aggregatedResult
  });
});

/**
 * Get latest readings from all devices
 */
const getLatestReadings = asyncHandler(async (req, res) => {
  // Group by device_id and get the latest reading for each
  const latestByDevice = new Map();

  sensorData.forEach(reading => {
    const existing = latestByDevice.get(reading.device_id);
    if (!existing || new Date(reading.timestamp) > new Date(existing.timestamp)) {
      latestByDevice.set(reading.device_id, reading);
    }
  });

  const latestReadings = Array.from(latestByDevice.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    data: {
      readings: latestReadings,
      total_devices: latestReadings.length,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Submit sensor data (for devices)
 */
const submitSensorData = asyncHandler(async (req, res) => {
  const { device_id, timestamp, readings } = req.body;

  // Verify device has permission to submit data
  if (req.user.role === 'device' && req.user.id !== device_id) {
    throw new ApiError(403, 'FORBIDDEN', 
      'Device can only submit data for itself');
  }

  const dataEntry = {
    id: uuidv4(),
    device_id,
    timestamp: timestamp || new Date().toISOString(),
    readings,
    received_at: new Date().toISOString()
  };

  sensorData.push(dataEntry);

  // Keep only last 10000 entries in memory (in production, use database)
  if (sensorData.length > 10000) {
    sensorData.shift();
  }

  res.status(201).json({
    success: true,
    data: {
      id: dataEntry.id,
      message: 'Sensor data submitted successfully',
      readings_count: readings.length
    }
  });
});

module.exports = {
  querySensorData,
  getDeviceData,
  getSensorTypeData,
  getAggregatedData,
  getLatestReadings,
  submitSensorData
};
