import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requestIdMiddleware } from '../../logging/request-id';
import { createCorsMiddleware } from '../cors';

describe('CORS and Request-ID middleware', () => {
  const allowedOrigin = 'http://localhost:3000';
  const app = express();

  app.use(requestIdMiddleware);
  app.use(createCorsMiddleware(allowedOrigin));
  app.get('/test', (_req, res) => {
    res.json({ ok: true });
  });

  it('sets Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });

  it('does NOT set Access-Control-Allow-Origin for disallowed origin', async () => {
    const res = await request(app)
      .get('/test')
      .set('Origin', 'http://malicious-site.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('honors incoming X-Request-Id header', async () => {
    const customId = 'client-custom-req-id-789';
    const res = await request(app)
      .get('/test')
      .set('X-Request-Id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('generates a new UUID when X-Request-Id is omitted', async () => {
    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    const generatedId = res.headers['x-request-id'];
    expect(generatedId).toBeDefined();
    // Verify standard UUID format
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
