import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { REDACTED_PATHS } from '../core/logging/logger';

describe('B18 Security Suite 7: Logging and Audit Redaction', () => {
  it('automatically redacts sensitive authorization headers, passwords, tokens, and raw CSVs', async () => {
    let capturedLogs = '';

    // Create a capturing writable destination
    const destination = {
      write: (chunk: string) => {
        capturedLogs += chunk;
      },
    };

    const capturingLogger = pino(
      {
        level: 'info',
        redact: {
          paths: REDACTED_PATHS,
          censor: '[REDACTED]',
        },
      },
      destination,
    );

    const sensitiveData = {
      user: 'alice',
      password: 'SuperSecretPassword123!',
      token: 'jwt_secret_token_abc_xyz',
      apiKey: 'ai_gemini_prod_key_999',
      rawCsv: 'name,balance\nCompanyA,50000000',
      req: {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret',
          cookie: 'better-auth.session=abcde12345',
        },
      },
    };

    capturingLogger.info(sensitiveData, 'Processed sensitive transaction event');

    // Asserts that sensitive values are never leaked in the log stream
    expect(capturedLogs).not.toContain('SuperSecretPassword123!');
    expect(capturedLogs).not.toContain('jwt_secret_token_abc_xyz');
    expect(capturedLogs).not.toContain('ai_gemini_prod_key_999');
    expect(capturedLogs).not.toContain('CompanyA,50000000');
    expect(capturedLogs).not.toContain('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(capturedLogs).not.toContain('better-auth.session=abcde12345');

    // Asserts that redaction censor marker replaced the fields
    expect(capturedLogs).toContain('[REDACTED]');
  });
});
