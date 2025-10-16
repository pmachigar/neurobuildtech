import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<RedisClientType> => {
  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected');
  });

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
  }
};

export const cacheDeviceStatus = async (
  deviceId: string,
  status: string,
  ttl: number = 300
): Promise<void> => {
  const client = getRedisClient();
  await client.setEx(`device:status:${deviceId}`, ttl, status);
};

export const getCachedDeviceStatus = async (
  deviceId: string
): Promise<string | null> => {
  const client = getRedisClient();
  return client.get(`device:status:${deviceId}`);
};
