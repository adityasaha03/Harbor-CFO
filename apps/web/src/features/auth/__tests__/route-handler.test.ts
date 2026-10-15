import { describe, it, expect } from 'vitest';
import { GET, POST } from '@/app/api/auth/[...all]/route';

describe('Better Auth Next.js API Route Handler', () => {
  it('exports GET and POST handler functions', () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');
    expect(POST).toBeDefined();
    expect(typeof POST).toBe('function');
  });

  it('responds to GET /api/auth/jwks', async () => {
    const req = new Request('http://localhost:3000/api/auth/jwks', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('keys');
    expect(Array.isArray(body.keys)).toBe(true);
  }, 20000);

  it('responds with 404 or bad request for unknown auth endpoints', async () => {
    const req = new Request('http://localhost:3000/api/auth/unknown-endpoint', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(404);
  }, 20000);
});
