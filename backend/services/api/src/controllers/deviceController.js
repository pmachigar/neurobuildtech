const { v4: uuidv4 } = require('uuid');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// In-memory storage (replace with database in production)
const devices = new Map();

/**
 * List all devices with filtering and pagination
 */
const listDevices = asyncHandler(async (req, res) => {
  const { status, type, location } = req.query;
  const { page, limit, offset } = req.pagination;

  let filteredDevices = Array.from(devices.values());

  // Apply filters
  if (status) {
    filteredDevices = filteredDevices.filter(d => d.status === status);
  }
  if (type) {
    filteredDevices = filteredDevices.filter(d => d.type === type);
  }
  if (location) {
    filteredDevices = filteredDevices.filter(d => 
      d.location && (
        d.location.building?.includes(location) ||
        d.location.floor?.includes(location) ||
        d.location.room?.includes(location)
      )
    );
  }

  // Pagination
  const total = filteredDevices.length;
  const paginatedDevices = filteredDevices.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      devices: paginatedDevices,
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
 * Register new device
 */
const registerDevice = asyncHandler(async (req, res) => {
  const deviceId = uuidv4();
  const apiKey = `DEVICE_${uuidv4().replace(/-/g, '')}`;

  const device = {
    id: deviceId,
    ...req.body,
    status: 'active',
    api_key: apiKey,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_seen: null,
    health: {
      online: false,
      battery: null,
      signal_strength: null
    }
  };

  devices.set(deviceId, device);

  res.status(201).json({
    success: true,
    data: {
      device: {
        ...device,
        // Include API key only on creation
        api_key: apiKey
      },
      message: 'Device registered successfully. Store the API key securely.'
    }
  });
});

/**
 * Get device details
 */
const getDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const device = devices.get(id);

  if (!device) {
    throw new ApiError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  // Remove sensitive data before sending
  const deviceData = { ...device };
  delete deviceData.api_key;

  res.json({
    success: true,
    data: { device: deviceData }
  });
});

/**
 * Update device configuration
 */
const updateDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const device = devices.get(id);

  if (!device) {
    throw new ApiError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  const updatedDevice = {
    ...device,
    ...req.body,
    updated_at: new Date().toISOString()
  };

  devices.set(id, updatedDevice);

  // Remove sensitive data before sending
  const deviceData = { ...updatedDevice };
  delete deviceData.api_key;

  res.json({
    success: true,
    data: { 
      device: deviceData,
      message: 'Device updated successfully'
    }
  });
});

/**
 * Deactivate device
 */
const deactivateDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const device = devices.get(id);

  if (!device) {
    throw new ApiError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  device.status = 'inactive';
  device.updated_at = new Date().toISOString();
  devices.set(id, device);

  res.json({
    success: true,
    data: { 
      message: 'Device deactivated successfully',
      device_id: id
    }
  });
});

/**
 * Get device status and health
 */
const getDeviceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const device = devices.get(id);

  if (!device) {
    throw new ApiError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  res.json({
    success: true,
    data: {
      device_id: id,
      status: device.status,
      health: device.health,
      last_seen: device.last_seen,
      uptime: device.last_seen ? 
        Math.floor((Date.now() - new Date(device.last_seen).getTime()) / 1000) : 
        null
    }
  });
});

/**
 * Bulk device operations
 */
const bulkDeviceOperations = asyncHandler(async (req, res) => {
  const { operation, device_ids, config } = req.body;
  
  const results = {
    success: [],
    failed: []
  };

  for (const deviceId of device_ids) {
    const device = devices.get(deviceId);
    
    if (!device) {
      results.failed.push({
        device_id: deviceId,
        reason: 'Device not found'
      });
      continue;
    }

    try {
      switch (operation) {
        case 'activate':
          device.status = 'active';
          break;
        case 'deactivate':
          device.status = 'inactive';
          break;
        case 'delete':
          devices.delete(deviceId);
          break;
        case 'update_config':
          if (config) {
            device.config = { ...device.config, ...config };
          }
          break;
      }
      
      if (operation !== 'delete') {
        device.updated_at = new Date().toISOString();
        devices.set(deviceId, device);
      }
      
      results.success.push(deviceId);
    } catch (error) {
      results.failed.push({
        device_id: deviceId,
        reason: error.message
      });
    }
  }

  res.json({
    success: true,
    data: {
      operation,
      results,
      message: `Processed ${device_ids.length} devices: ${results.success.length} succeeded, ${results.failed.length} failed`
    }
  });
});

module.exports = {
  listDevices,
  registerDevice,
  getDevice,
  updateDevice,
  deactivateDevice,
  getDeviceStatus,
  bulkDeviceOperations
};
