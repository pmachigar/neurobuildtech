import { Request, Response } from 'express';
import { Device, DeviceStatus, IDevice } from '../models/Device';
import { generateDeviceId, generateApiKey } from '../utils/deviceUtils';
import { generateToken } from '../utils/jwt';
import { cacheDeviceStatus } from '../utils/redis';

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { name, deviceType, description, location, sensors, metadata } =
      req.body;

    const deviceId = generateDeviceId();
    const apiKey = await generateApiKey();

    const device = new Device({
      deviceId,
      deviceType: deviceType || 'ESP32-S3',
      name,
      description,
      location,
      sensors,
      apiKey,
      metadata: metadata || {},
      status: DeviceStatus.OFFLINE,
      configVersion: 1,
      config: {},
      configHistory: [
        {
          version: 1,
          config: {},
          timestamp: new Date(),
        },
      ],
      connectionStats: {
        totalConnections: 0,
        uptimeSeconds: 0,
      },
    });

    await device.save();

    const token = generateToken({ deviceId, type: deviceType || 'ESP32-S3' });

    return res.status(201).json({
      success: true,
      data: {
        deviceId: device.deviceId,
        name: device.name,
        deviceType: device.deviceType,
        sensors: device.sensors,
        apiKey,
        token,
        status: device.status,
      },
    });
  } catch (error: any) {
    console.error('Register device error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register device',
    });
  }
};

export const bulkRegisterDevices = async (req: Request, res: Response) => {
  try {
    const { devices } = req.body;

    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Devices array is required and cannot be empty',
      });
    }

    const registeredDevices = [];
    const errors = [];

    for (let i = 0; i < devices.length; i++) {
      try {
        const deviceData = devices[i];
        const deviceId = generateDeviceId();
        const apiKey = await generateApiKey();

        const device = new Device({
          deviceId,
          deviceType: deviceData.deviceType || 'ESP32-S3',
          name: deviceData.name,
          description: deviceData.description,
          location: deviceData.location,
          sensors: deviceData.sensors,
          apiKey,
          metadata: deviceData.metadata || {},
          status: DeviceStatus.OFFLINE,
          configVersion: 1,
          config: {},
          configHistory: [
            {
              version: 1,
              config: {},
              timestamp: new Date(),
            },
          ],
          connectionStats: {
            totalConnections: 0,
            uptimeSeconds: 0,
          },
        });

        await device.save();

        const token = generateToken({
          deviceId,
          type: deviceData.deviceType || 'ESP32-S3',
        });

        registeredDevices.push({
          deviceId: device.deviceId,
          name: device.name,
          apiKey,
          token,
        });
      } catch (error: any) {
        errors.push({
          index: i,
          name: devices[i].name,
          error: error.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        registered: registeredDevices.length,
        devices: registeredDevices,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('Bulk register error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register devices',
    });
  }
};

export const getDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    return res.json({
      success: true,
      data: device,
    });
  } catch (error: any) {
    console.error('Get device error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get device',
    });
  }
};

export const listDevices = async (req: Request, res: Response) => {
  try {
    const {
      status,
      deviceType,
      location,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (deviceType) filter.deviceType = deviceType;
    if (location) filter['location.name'] = location;

    const skip = (Number(page) - 1) * Number(limit);

    const devices = await Device.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Device.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        devices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List devices error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list devices',
    });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { name, description, location, sensors, metadata } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    if (name) device.name = name;
    if (description) device.description = description;
    if (location) device.location = location;
    if (sensors) device.sensors = sensors;
    if (metadata) device.metadata = { ...device.metadata, ...metadata };

    await device.save();

    return res.json({
      success: true,
      data: device,
    });
  } catch (error: any) {
    console.error('Update device error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update device',
    });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOneAndDelete({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    return res.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete device error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete device',
    });
  }
};

export const updateDeviceConfig = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { config } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    const newVersion = device.configVersion + 1;

    device.configHistory.push({
      version: device.configVersion,
      config: device.config,
      timestamp: new Date(),
    });

    device.config = config;
    device.configVersion = newVersion;

    await device.save();

    return res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        configVersion: device.configVersion,
        config: device.config,
      },
    });
  } catch (error: any) {
    console.error('Update config error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configuration',
    });
  }
};

export const bulkUpdateConfig = async (req: Request, res: Response) => {
  try {
    const { deviceIds, config } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Device IDs array is required',
      });
    }

    const updated = [];
    const errors = [];

    for (const deviceId of deviceIds) {
      try {
        const device = await Device.findOne({ deviceId });

        if (!device) {
          errors.push({ deviceId, error: 'Device not found' });
          continue;
        }

        const newVersion = device.configVersion + 1;

        device.configHistory.push({
          version: device.configVersion,
          config: device.config,
          timestamp: new Date(),
        });

        device.config = config;
        device.configVersion = newVersion;

        await device.save();
        updated.push(deviceId);
      } catch (error: any) {
        errors.push({ deviceId, error: error.message });
      }
    }

    return res.json({
      success: true,
      data: {
        updated: updated.length,
        deviceIds: updated,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('Bulk update config error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configurations',
    });
  }
};

export const rollbackConfig = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { version } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    const historicalConfig = device.configHistory.find(
      (h) => h.version === version
    );

    if (!historicalConfig) {
      return res.status(404).json({
        success: false,
        error: 'Configuration version not found',
      });
    }

    const newVersion = device.configVersion + 1;

    device.configHistory.push({
      version: device.configVersion,
      config: device.config,
      timestamp: new Date(),
    });

    device.config = historicalConfig.config;
    device.configVersion = newVersion;

    await device.save();

    return res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        configVersion: device.configVersion,
        config: device.config,
        rolledBackFrom: version,
      },
    });
  } catch (error: any) {
    console.error('Rollback config error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to rollback configuration',
    });
  }
};

export const getConfigHistory = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    return res.json({
      success: true,
      data: {
        currentVersion: device.configVersion,
        currentConfig: device.config,
        history: device.configHistory,
      },
    });
  } catch (error: any) {
    console.error('Get config history error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get configuration history',
    });
  }
};

export const updateDeviceStatus = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;

    if (!Object.values(DeviceStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
      });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    const now = new Date();
    device.status = status;
    device.lastSeen = now;

    if (status === DeviceStatus.ONLINE) {
      device.connectionStats.totalConnections += 1;
      device.connectionStats.lastConnectedAt = now;
    } else if (status === DeviceStatus.OFFLINE) {
      device.connectionStats.lastDisconnectedAt = now;
      if (device.connectionStats.lastConnectedAt) {
        const uptimeMs =
          now.getTime() - device.connectionStats.lastConnectedAt.getTime();
        device.connectionStats.uptimeSeconds += Math.floor(uptimeMs / 1000);
      }
    }

    await device.save();
    await cacheDeviceStatus(deviceId, status);

    return res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        connectionStats: device.connectionStats,
      },
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update device status',
    });
  }
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    const now = new Date();
    device.lastSeen = now;
    await device.save();

    return res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        configVersion: device.configVersion,
      },
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Health check failed',
    });
  }
};

export const getDeviceStats = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    return res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        connectionStats: device.connectionStats,
        lastSeen: device.lastSeen,
        uptime: {
          seconds: device.connectionStats.uptimeSeconds,
          formatted: formatUptime(device.connectionStats.uptimeSeconds),
        },
      },
    });
  } catch (error: any) {
    console.error('Get device stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get device statistics',
    });
  }
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};
