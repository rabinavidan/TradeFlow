import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ uri: env.MONGODB_URI }, 'MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
