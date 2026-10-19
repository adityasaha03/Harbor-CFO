import { describe, expect, it } from 'vitest';
import { parseEnv, getGeminiApiKeys } from '../env';

describe('Environment configuration (env.ts)', () => {
  it('fails fast when a required variable is missing', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI is required/);
  });

  it('applies default values when only required variables are provided', () => {
    const parsed = parseEnv({
      MONGODB_URI: 'mongodb://localhost:27017',
    });

    expect(parsed.PORT).toBe(4000);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.MONGODB_DB_NAME).toBe('harbor');
    expect(parsed.BETTER_AUTH_URL).toBe('http://localhost:3000');
    expect(parsed.BETTER_AUTH_JWKS_URL).toBeUndefined();
    expect(parsed.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(parsed.LOG_LEVEL).toBe('info');
    expect(parsed.LLM_PROVIDER).toBe('replay');
    expect(parsed.AGENT_MAX_TOOL_CALLS).toBe(6);
    expect(parsed.AGENT_TIMEOUT_MS).toBe(45000);
  });

  it('fails when an invalid enum or malformed URL is passed', () => {
    expect(() =>
      parseEnv({
        MONGODB_URI: 'mongodb://localhost:27017',
        WEB_ORIGIN: 'not-a-valid-url',
      }),
    ).toThrow(/Invalid url/);

    expect(() =>
      parseEnv({
        MONGODB_URI: 'mongodb://localhost:27017',
        LLM_PROVIDER: 'unsupported-provider',
      }),
    ).toThrow(/Invalid environment configuration/);

    expect(() =>
      parseEnv({
        MONGODB_URI: 'mongodb://localhost:27017',
        PORT: -50,
      }),
    ).toThrow(/Invalid environment configuration/);
  });

  it('correctly parses custom valid environment settings', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net',
      MONGODB_DB_NAME: 'harbor_prod',
      BETTER_AUTH_URL: 'https://auth.harbor.app',
      BETTER_AUTH_JWKS_URL: 'https://auth.harbor.app/api/auth/jwks',
      WEB_ORIGIN: 'https://app.harbor.app',
      LOG_LEVEL: 'warn',
      LLM_PROVIDER: 'gemini',
      LLM_MODEL: 'gemini-2.0-flash',
      GEMINI_API_KEY: 'test-api-key',
      AGENT_MAX_TOOL_CALLS: '10',
      AGENT_TIMEOUT_MS: '60000',
    });

    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.PORT).toBe(8080);
    expect(parsed.MONGODB_URI).toBe('mongodb+srv://user:pass@cluster.mongodb.net');
    expect(parsed.MONGODB_DB_NAME).toBe('harbor_prod');
    expect(parsed.BETTER_AUTH_URL).toBe('https://auth.harbor.app');
    expect(parsed.BETTER_AUTH_JWKS_URL).toBe('https://auth.harbor.app/api/auth/jwks');
    expect(parsed.WEB_ORIGIN).toBe('https://app.harbor.app');
    expect(parsed.LOG_LEVEL).toBe('warn');
    expect(parsed.LLM_PROVIDER).toBe('gemini');
    expect(parsed.LLM_MODEL).toBe('gemini-2.0-flash');
    expect(parsed.GEMINI_API_KEY).toBe('test-api-key');
    expect(parsed.AGENT_MAX_TOOL_CALLS).toBe(10);
    expect(parsed.AGENT_TIMEOUT_MS).toBe(60000);
  });

  it('extracts and deduplicates multi-key configurations via getGeminiApiKeys', () => {
    expect(getGeminiApiKeys({ GEMINI_API_KEY: 'key-1' })).toEqual(['key-1']);
    expect(getGeminiApiKeys({ GEMINI_API_KEYS: 'key-A, key-B, key-C' })).toEqual([
      'key-A',
      'key-B',
      'key-C',
    ]);
    expect(getGeminiApiKeys({ GEMINI_API_KEY: 'key-1, key-2, key-1' })).toEqual([
      'key-1',
      'key-2',
    ]);
    expect(getGeminiApiKeys({})).toEqual([]);
  });
});
