import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('middleware', () => {
  const createRequest = (pathname: string, cookies?: Record<string, string>) => {
    const url = new URL(pathname, 'http://localhost:3000');
    const headers = new Headers();
    if (cookies) {
      const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers.set('cookie', cookieHeader);
    }
    return new NextRequest(url, { headers });
  };

  it('redirects unauthenticated users on protected route /dashboard to /sign-in', () => {
    const req = createRequest('/dashboard');
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?callbackUrl=%2Fdashboard'
    );
  });

  it('allows unauthenticated requests on unmatched/invalid routes to pass through to 404', () => {
    const req = createRequest('/sadsd');
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated users on protected sub-route with callbackUrl', () => {
    const req = createRequest('/forecast');
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?callbackUrl=%2Fforecast'
    );
  });

  it('redirects authenticated users on /sign-in to /dashboard', () => {
    const req = createRequest('/sign-in', {
      'better-auth.session_token': 'mock-valid-token',
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('allows unauthenticated users to access /sign-in', () => {
    const req = createRequest('/sign-in');
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('allows authenticated users to access /dashboard', () => {
    const req = createRequest('/dashboard', {
      'better-auth.session_token': 'mock-valid-token',
    });
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('redirects root / to /sign-in when unauthenticated and to /dashboard when authenticated', () => {
    const unauthReq = createRequest('/');
    const unauthRes = middleware(unauthReq);
    expect(unauthRes.headers.get('location')).toBe('http://localhost:3000/sign-in');

    const authReq = createRequest('/', {
      'better-auth.session_token': 'mock-valid-token',
    });
    const authRes = middleware(authReq);
    expect(authRes.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });
});
