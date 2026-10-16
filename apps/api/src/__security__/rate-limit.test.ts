import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRateLimiter } from '../core/security/rate-limit';
import { errorHandler } from '../core/http/error-handler';

describe('B18 Security Suite 5: Rate Limiting Enforcement', () => {
  it('enforces rate limit threshold and returns HTTP 429 with Retry-After header', async () => {
    const testApp = express();

    // Create limiter with low max for testing
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 2,
      keyGenerator: () => 'test_client_key',
    });

    testApp.use('/test-rate-limit', limiter, (_req, res) => {
      res.json({ ok: true });
    });
    testApp.use(errorHandler);

    // Request 1: Allowed
    const res1 = await request(testApp).get('/test-rate-limit');
    expect(res1.status).toBe(200);

    // Request 2: Allowed
    const res2 = await request(testApp).get('/test-rate-limit');
    expect(res2.status).toBe(200);

    // Request 3: Rate limited -> 429
    const res3 = await request(testApp).get('/test-rate-limit');
    expect(res3.status).toBe(429);
    expect(res3.body.error?.code).toBe('RATE_LIMITED');
    expect(res3.headers['retry-after']).toBeDefined();
  });

  it('isolates rate limits per user/tenant key', async () => {
    const testApp = express();

    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 1,
      keyGenerator: (req) => (req.headers['x-user-id'] as string) || 'anon',
    });

    testApp.use('/isolated-limit', limiter, (_req, res) => {
      res.json({ ok: true });
    });
    testApp.use(errorHandler);

    // User 1 hit limit
    const u1_1 = await request(testApp).get('/isolated-limit').set('x-user-id', 'user_1');
    expect(u1_1.status).toBe(200);

    const u1_2 = await request(testApp).get('/isolated-limit').set('x-user-id', 'user_1');
    expect(u1_2.status).toBe(429);

    // User 2 should NOT be affected by User 1's consumption
    const u2_1 = await request(testApp).get('/isolated-limit').set('x-user-id', 'user_2');
    expect(u2_1.status).toBe(200);
  });
});
