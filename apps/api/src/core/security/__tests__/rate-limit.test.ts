import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../http/error-handler';
import { createRateLimiter } from '../rate-limit';

describe('Rate limiter factory', () => {
  it('allows 120 requests and returns 429 with Retry-After on the 121st request', async () => {
    const app = express();
    // Default 120 requests per window
    app.use(createRateLimiter({ windowMs: 60 * 1000, max: 120 }));
    app.get('/api/test', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    // Fire 120 requests sequentially or in parallel batches
    const batchSize = 20;
    for (let i = 0; i < 120; i += batchSize) {
      const promises = Array.from({ length: batchSize }, () =>
        request(app).get('/api/test'),
      );
      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
    }

    // 121st request must trigger 429
    const limitedRes = await request(app).get('/api/test');
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers['retry-after']).toBeDefined();
    expect(Number(limitedRes.headers['retry-after'])).toBeGreaterThan(0);
    expect(limitedRes.body).toEqual({
      error: expect.objectContaining({
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      }),
    });
  });

  it('supports custom limits and keyGenerator', async () => {
    const app = express();
    app.use(
      createRateLimiter({
        windowMs: 30 * 1000,
        max: 2,
        keyGenerator: (req) =>
          (req.headers['x-custom-key'] as string) || 'default-key',
      }),
    );
    app.get('/api/custom', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    // Key A: 2 requests pass
    const resA1 = await request(app)
      .get('/api/custom')
      .set('X-Custom-Key', 'user-A');
    const resA2 = await request(app)
      .get('/api/custom')
      .set('X-Custom-Key', 'user-A');
    expect(resA1.status).toBe(200);
    expect(resA2.status).toBe(200);

    // Key A: 3rd request blocked
    const resA3 = await request(app)
      .get('/api/custom')
      .set('X-Custom-Key', 'user-A');
    expect(resA3.status).toBe(429);

    // Key B: first request still passes (isolated by key)
    const resB1 = await request(app)
      .get('/api/custom')
      .set('X-Custom-Key', 'user-B');
    expect(resB1.status).toBe(200);
  });
});
