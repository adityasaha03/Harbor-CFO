import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthRouter, setReadinessCheck } from '@/features/health';
import { connectMongo, disconnectMongo, getDb, isDbReady } from '../mongo';
import { setupTestReplSet, teardownTestReplSet } from '../test/mongo-test-harness';

describe('MongoDB Connection & Health Readiness', () => {
  let testUri: string;

  beforeAll(async () => {
    testUri = await setupTestReplSet();
  }, 180000);

  afterAll(async () => {
    await teardownTestReplSet();
  });

  it('reports isDbReady as true when connected', () => {
    expect(isDbReady()).toBe(true);
  });

  it('provides native getDb instance for Better Auth collections', () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(typeof db.collection).toBe('function');
  });

  it('wires isDbReady into health ready endpoint returning 200 when connected', async () => {
    const app = express();
    setReadinessCheck(isDbReady);
    app.use('/health', healthRouter);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: 'ready',
      },
    });
  });

  it('wires isDbReady into health ready endpoint returning 503 when disconnected', async () => {
    await disconnectMongo();
    expect(isDbReady()).toBe(false);

    const app = express();
    setReadinessCheck(isDbReady);
    app.use('/health', healthRouter);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'Service not ready',
      },
    });

    // Reconnect for remaining tests
    await connectMongo(testUri, 'harbor_test');
    expect(isDbReady()).toBe(true);
  });
});
