import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Device } from '../models/Device';

export interface AuthRequest extends Request {
  device?: {
    deviceId: string;
    type: string;
  };
}

export const authenticateDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const device = await Device.findOne({ deviceId: decoded.deviceId });
    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Invalid device',
      });
    }

    req.device = {
      deviceId: decoded.deviceId,
      type: decoded.type,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'No API key provided',
      });
    }

    const device = await Device.findOne({ apiKey });
    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    req.device = {
      deviceId: device.deviceId,
      type: device.deviceType,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};
