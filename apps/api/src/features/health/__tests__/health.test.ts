import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import {
  healthRouter,
  resetReadinessCheck,
  setReadinessCheck,
} from '../index';

describe('Health endpoints', () => {
  const app = express();
  app.use('/health', healthRouter);

  afterEach(() => {
    resetReadinessCheck();
  });

  it('GET /health/live always returns 200 with uptime', async () => {
    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        uptime: expect.any(Number),
      },
    });
  });

  it('GET /health/ready returns 200 by default', async () => {
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: 'ready',
      },
    });
  });

  it('GET /health/ready returns 503 when readinessCheck returns false', async () => {
    setReadinessCheck(async () => false);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'Service not ready',
      },
    });
  });
});
