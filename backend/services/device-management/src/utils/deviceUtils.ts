import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export const generateDeviceId = (): string => {
  return `ESP32-${uuidv4().split('-')[0].toUpperCase()}`;
};

export const generateApiKey = async (): Promise<string> => {
  const key = uuidv4();
  const hashedKey = await bcrypt.hash(key, config.apiKey.saltRounds);
  return hashedKey;
};

export const validateApiKey = async (
  plainKey: string,
  hashedKey: string
): Promise<boolean> => {
  return bcrypt.compare(plainKey, hashedKey);
};
