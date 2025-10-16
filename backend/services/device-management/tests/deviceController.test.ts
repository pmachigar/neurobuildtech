import { Device, DeviceStatus, SensorType } from '../src/models/Device';
import * as deviceController from '../src/controllers/deviceController';
import { Request, Response } from 'express';

jest.mock('../src/models/Device');
jest.mock('../src/utils/deviceUtils');
jest.mock('../src/utils/jwt');
jest.mock('../src/utils/redis');

const mockRequest = (body: any = {}, params: any = {}, query: any = {}) => {
  return {
    body,
    params,
    query,
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Device Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a new device successfully', async () => {
      const req = mockRequest({
        name: 'Test Device',
        deviceType: 'ESP32-S3',
        sensors: [
          { type: SensorType.LD2410, enabled: true },
          { type: SensorType.PIR, enabled: true },
        ],
      });
      const res = mockResponse();

      const mockDevice = {
        deviceId: 'ESP32-TEST123',
        name: 'Test Device',
        deviceType: 'ESP32-S3',
        sensors: [
          { type: SensorType.LD2410, enabled: true },
          { type: SensorType.PIR, enabled: true },
        ],
        status: DeviceStatus.OFFLINE,
        save: jest.fn().mockResolvedValue(true),
      };

      (Device as any).mockImplementation(() => mockDevice);

      const { generateDeviceId, generateApiKey } = require('../src/utils/deviceUtils');
      generateDeviceId.mockReturnValue('ESP32-TEST123');
      generateApiKey.mockResolvedValue('test-api-key');

      const { generateToken } = require('../src/utils/jwt');
      generateToken.mockReturnValue('test-jwt-token');

      await deviceController.registerDevice(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            deviceId: 'ESP32-TEST123',
            name: 'Test Device',
          }),
        })
      );
    });

    it('should handle registration errors', async () => {
      const req = mockRequest({
        name: 'Test Device',
        sensors: [],
      });
      const res = mockResponse();

      (Device as any).mockImplementation(() => {
        throw new Error('Validation failed');
      });

      await deviceController.registerDevice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });
  });

  describe('getDevice', () => {
    it('should return device details', async () => {
      const req = mockRequest({}, { deviceId: 'ESP32-TEST123' });
      const res = mockResponse();

      const mockDevice = {
        deviceId: 'ESP32-TEST123',
        name: 'Test Device',
        status: DeviceStatus.ONLINE,
      };

      (Device.findOne as jest.Mock).mockResolvedValue(mockDevice);

      await deviceController.getDevice(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDevice,
        })
      );
    });

    it('should return 404 when device not found', async () => {
      const req = mockRequest({}, { deviceId: 'NONEXISTENT' });
      const res = mockResponse();

      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await deviceController.getDevice(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Device not found',
        })
      );
    });
  });

  describe('updateDeviceConfig', () => {
    it('should update device configuration', async () => {
      const req = mockRequest(
        { config: { samplingRate: 1000 } },
        { deviceId: 'ESP32-TEST123' }
      );
      const res = mockResponse();

      const mockDevice = {
        deviceId: 'ESP32-TEST123',
        configVersion: 1,
        config: {},
        configHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (Device.findOne as jest.Mock).mockResolvedValue(mockDevice);

      await deviceController.updateDeviceConfig(req, res);

      expect(mockDevice.configVersion).toBe(2);
      expect(mockDevice.config).toEqual({ samplingRate: 1000 });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            configVersion: 2,
          }),
        })
      );
    });
  });

  describe('updateDeviceStatus', () => {
    it('should update device status to online', async () => {
      const req = mockRequest(
        { status: DeviceStatus.ONLINE },
        { deviceId: 'ESP32-TEST123' }
      );
      const res = mockResponse();

      const mockDevice = {
        deviceId: 'ESP32-TEST123',
        status: DeviceStatus.OFFLINE,
        connectionStats: {
          totalConnections: 0,
          uptimeSeconds: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      (Device.findOne as jest.Mock).mockResolvedValue(mockDevice);

      const { cacheDeviceStatus } = require('../src/utils/redis');
      cacheDeviceStatus.mockResolvedValue(true);

      await deviceController.updateDeviceStatus(req, res);

      expect(mockDevice.status).toBe(DeviceStatus.ONLINE);
      expect(mockDevice.connectionStats.totalConnections).toBe(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should reject invalid status', async () => {
      const req = mockRequest(
        { status: 'invalid-status' },
        { deviceId: 'ESP32-TEST123' }
      );
      const res = mockResponse();

      await deviceController.updateDeviceStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid status value',
        })
      );
    });
  });

  describe('listDevices', () => {
    it('should list devices with pagination', async () => {
      const req = mockRequest({}, {}, { page: 1, limit: 10 });
      const res = mockResponse();

      const mockDevices = [
        { deviceId: 'ESP32-1', name: 'Device 1' },
        { deviceId: 'ESP32-2', name: 'Device 2' },
      ];

      (Device.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDevices),
      });

      (Device.countDocuments as jest.Mock).mockResolvedValue(2);

      await deviceController.listDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            devices: mockDevices,
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: 2,
            }),
          }),
        })
      );
    });
  });

  describe('rollbackConfig', () => {
    it('should rollback to a previous configuration', async () => {
      const req = mockRequest(
        { version: 1 },
        { deviceId: 'ESP32-TEST123' }
      );
      const res = mockResponse();

      const mockDevice = {
        deviceId: 'ESP32-TEST123',
        configVersion: 3,
        config: { samplingRate: 2000 },
        configHistory: [
          {
            version: 1,
            config: { samplingRate: 500 },
            timestamp: new Date(),
          },
          {
            version: 2,
            config: { samplingRate: 1000 },
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (Device.findOne as jest.Mock).mockResolvedValue(mockDevice);

      await deviceController.rollbackConfig(req, res);

      expect(mockDevice.config).toEqual({ samplingRate: 500 });
      expect(mockDevice.configVersion).toBe(4);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            rolledBackFrom: 1,
          }),
        })
      );
    });
  });
});
