import mongoose from 'mongoose';
import app from './app';
import { config } from './config';
import { connectRedis, disconnectRedis } from './utils/redis';

const startServer = async () => {
  try {
    console.log('Starting Device Management Service...');

    await mongoose.connect(config.mongodb.uri);
    console.log('MongoDB connected successfully');

    try {
      await connectRedis();
      console.log('Redis connected successfully');
    } catch (error) {
      console.warn('Redis connection failed, continuing without cache:', error);
    }

    const server = app.listen(config.port, () => {
      console.log(
        `Server is running on port ${config.port} in ${config.env} mode`
      );
      console.log(`API Documentation: http://localhost:${config.port}/api-docs`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
        } catch (error) {
          console.error('Error closing MongoDB:', error);
        }

        try {
          await disconnectRedis();
          console.log('Redis connection closed');
        } catch (error) {
          console.error('Error closing Redis:', error);
        }

        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
