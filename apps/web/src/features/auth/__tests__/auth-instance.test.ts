import { describe, it, expect } from 'vitest';
import { auth } from '../server/auth';
import { authClient } from '../lib/auth-client';

describe('Better Auth server and client instances', () => {
  it('auth server instance has handler and api defined', () => {
    expect(auth).toBeDefined();
    expect(auth.handler).toBeDefined();
    expect(typeof auth.handler).toBe('function');
    expect(auth.api).toBeDefined();
  });

  it('auth instance registers organization, jwt, and nextCookies plugins', () => {
    const pluginIds = auth.options.plugins?.map((p) => p.id) ?? [];
    expect(pluginIds).toContain('organization');
    expect(pluginIds).toContain('jwt');
    expect(pluginIds).toContain('next-cookies');
  });

  it('auth instance configures rate limiting and email/password requirements', () => {
    expect(auth.options.rateLimit).toBeDefined();
    expect(auth.options.rateLimit?.enabled).toBe(true);

    expect(auth.options.emailAndPassword).toBeDefined();
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(8);
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  it('authClient is initialized with organization and jwt plugins', () => {
    expect(authClient).toBeDefined();
    expect(authClient.organization).toBeDefined();
    expect(typeof authClient.token).toBe('function');
  });
});
