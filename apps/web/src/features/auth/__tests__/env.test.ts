import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getServerAuthEnv, resetServerAuthEnvCache } from '../server/env';

describe('getServerAuthEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetServerAuthEnvCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetServerAuthEnvCache();
  });

  it('validates and returns environment variables when all required keys are present', () => {
    process.env.BETTER_AUTH_SECRET = 'supersecretlongenoughkey123456';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.MONGODB_DB_NAME = 'harbor';

    const env = getServerAuthEnv();
    expect(env.BETTER_AUTH_SECRET).toBe('supersecretlongenoughkey123456');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000');
    expect(env.MONGODB_URI).toBe('mongodb://localhost:27017/test');
    expect(env.MONGODB_DB_NAME).toBe('harbor');
  });

  it('fails with a clear error message when required variables are missing', () => {
    delete process.env.BETTER_AUTH_SECRET;
    resetServerAuthEnvCache();

    expect(() => getServerAuthEnv()).toThrow(
      '[Harbor Auth] Server environment configuration error:'
    );
  });
});
