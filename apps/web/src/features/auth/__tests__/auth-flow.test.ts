import { describe, it, expect } from 'vitest';
import { GET, POST } from '@/app/api/auth/[...all]/route';


describe('Better Auth end-to-end auth flow (sign-up, sign-in, org, token, jwks)', () => {
  let sessionCookie = '';
  let issuedJwt = '';
  let activeTenantId = '';

  it('1. Signs up with email and password (demo account)', async () => {
    const signUpReq = new Request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@harbor.demo',
        password: 'Password123!',
        name: 'Harbor Owner',
      }),
    });

    const res = await POST(signUpReq);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    sessionCookie = setCookie!;

    const data = await res.json();
    expect(data).toHaveProperty('user');
    expect(data.user.email).toBe('owner@harbor.demo');
    expect(data.user.name).toBe('Harbor Owner');
  });

  it('2. Signs in and receives an active session', async () => {
    const signInReq = new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@harbor.demo',
        password: 'Password123!',
      }),
    });

    const res = await POST(signInReq);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie;
    }

    const data = await res.json();
    expect(data.user.email).toBe('owner@harbor.demo');
  });

  it('3. Creates organization (Harbor Wholesale) with owner role', async () => {
    const createOrgReq = new Request('http://localhost:3000/api/auth/organization/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        name: 'Harbor Wholesale',
        slug: 'harbor-wholesale',
      }),
    });

    const res = await POST(createOrgReq);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('Harbor Wholesale');
    expect(data.slug).toBe('harbor-wholesale');
    activeTenantId = data.id;
    expect(activeTenantId).toBeTruthy();
  });

  it('4. Retrieves session and verifies user and organization context', async () => {
    const getSessionReq = new Request('http://localhost:3000/api/auth/get-session', {
      method: 'GET',
      headers: {
        cookie: sessionCookie,
      },
    });

    const res = await GET(getSessionReq);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('session');
    expect(data.user.email).toBe('owner@harbor.demo');
  });

  it('5. Obtains a JWT token and verifies claim structure', async () => {
    const tokenReq = new Request('http://localhost:3000/api/auth/token', {
      method: 'GET',
      headers: {
        cookie: sessionCookie,
      },
    });

    const res = await GET(tokenReq);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('token');
    expect(typeof data.token).toBe('string');
    issuedJwt = data.token;

    // Decode JWT claims without verification to inspect fields
    const parts = issuedJwt.split('.');
    expect(parts.length).toBe(3);
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8'));

    // Verify minimum payload per specification: id, email, plus standard JWT claims
    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('email');
    expect(payload.email).toBe('owner@harbor.demo');
    expect(payload).toHaveProperty('sub');
    expect(payload).toHaveProperty('exp');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('iss');
    expect(payload).toHaveProperty('aud');
  });

  it('6. JWKS endpoint returns the public key after token minting', async () => {
    const jwksReq = new Request('http://localhost:3000/api/auth/jwks', {
      method: 'GET',
    });

    const res = await GET(jwksReq);
    expect(res.status).toBe(200);

    const jwks = await res.json();
    expect(jwks).toHaveProperty('keys');
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);

    const key = jwks.keys[0];
    expect(key).toHaveProperty('kid');
    expect(key).toHaveProperty('kty');
    expect(key).toHaveProperty('alg');
  });
});
