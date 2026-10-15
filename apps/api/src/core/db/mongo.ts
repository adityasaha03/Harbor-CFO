import mongoose from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../logging/logger';

let eventListenersAttached = false;

function attachConnectionListeners(): void {
  if (eventListenersAttached) {
    return;
  }

  mongoose.connection.on('connected', () => {
    logger.info({ host: mongoose.connection.host, port: mongoose.connection.port }, 'MongoDB connected');
  });

  mongoose.connection.on('error', (err: Error) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  eventListenersAttached = true;
}

/**
 * Connect to MongoDB using Mongoose.
 * Fails fast and throws if the initial connection cannot be established.
 */
export async function connectMongo(uri?: string, dbName?: string): Promise<typeof mongoose> {
  const targetUri = uri ?? env.MONGODB_URI;
  const targetDbName = dbName ?? env.MONGODB_DB_NAME;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  attachConnectionListeners();

  try {
    return await mongoose.connect(targetUri, {
      dbName: targetDbName,
    });
  } catch (error) {
    logger.fatal({ err: error, targetDbName }, 'Failed to connect to MongoDB');
    throw error;
  }
}

/**
 * Gracefully disconnect from MongoDB.
 */
export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
}

/**
 * Check if the database connection is ready to serve queries.
 * Returns true if Mongoose is connected (readyState === 1).
 */
export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Access native MongoDB Db instance for collections managed outside Mongoose
 * (e.g. Better Auth collections: user, organization, member).
 */
export function getDb(): mongoose.mongo.Db {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not established. Cannot access native Db.');
  }
  return db;
}
