import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectMongo, disconnectMongo } from '../mongo';

let replSetInstance: MongoMemoryReplSet | null = null;

/**
 * Starts an in-memory MongoDB replica set and connects Mongoose.
 * Replica set is required for transactions in MongoDB.
 */
export async function setupTestReplSet(): Promise<string> {
  if (!replSetInstance) {
    replSetInstance = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: 'wiredTiger',
      },
    });
  }

  const uri = replSetInstance.getUri();
  await connectMongo(uri, 'harbor_test');
  return uri;
}

/**
 * Disconnects Mongoose and stops the in-memory replica set.
 */
export async function teardownTestReplSet(): Promise<void> {
  await disconnectMongo();
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}

/**
 * Clears all documents from all collections in the test database.
 */
export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  const clearPromises = Object.values(collections).map(async (collection) => {
    try {
      await collection.deleteMany({});
    } catch {
      // Ignore if collection was dropped
    }
  });

  await Promise.all(clearPromises);
}

/**
 * Wires Vitest lifecycle hooks for integration tests needing real MongoDB with transactions.
 * Starts in-memory replica set before tests, clears all collections after each test,
 * and disconnects/stops the replica set after all tests.
 */
export function useTestDb(): void {
  beforeAll(async () => {
    await setupTestReplSet();
  }, 180000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestReplSet();
  });
}
