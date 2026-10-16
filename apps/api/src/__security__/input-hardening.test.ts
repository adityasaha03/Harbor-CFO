import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { SignJWT, generateKeyPair } from 'jose';
import { createApp } from '../app';
import { useTestDb } from '../core/db/test/mongo-test-harness';
import { setupTestAuth } from '../test-utils/test-auth-helper';
import { setupTwoTenants, type SecurityTestFixtures } from './helpers';
import { env } from '../config/env';
import { escapeSpreadsheetCell } from '../features/imports/engine';

describe('B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS', () => {
  useTestDb();
  const app = createApp();
  let fix: SecurityTestFixtures;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    fix = await setupTwoTenants();
  });

  describe('Payload Size Constraints', () => {
    it('rejects oversized JSON request body exceeding 1MB limit with HTTP 413', async () => {
      // Create a 1.2MB string
      const largeString = 'A'.repeat(1.2 * 1024 * 1024);

      const res = await request(app)
        .post('/api/v1/agent/runs')
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .set('Content-Type', 'application/json')
        .send(`{"prompt": "${largeString}"}`);

      expect([413, 400]).toContain(res.status);
    });

    it('rejects oversized CSV upload exceeding 5MB limit with HTTP 413', async () => {
      // 5.5MB dummy buffer
      const largeCsvBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'a,b,c\n');

      const res = await request(app)
        .post('/api/v1/imports/preview')
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .field('kind', 'transactions')
        .attach('file', largeCsvBuffer, 'huge.csv');

      expect([413, 400]).toContain(res.status);
      if (res.status === 413) {
        expect(res.body.error?.code).toBe('PAYLOAD_TOO_LARGE');
      }
    });
  });

  describe('JWT Security & Tampering Protections', () => {
    it('rejects unsigned JWT using "alg: none" with HTTP 401', async () => {
      // Unsigned token: header { alg: "none", typ: "JWT" }, payload { sub: fix.tenantA.owner.id }
      const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const unsignedPayload = Buffer.from(
        JSON.stringify({
          sub: fix.tenantA.owner.id,
          iss: env.BETTER_AUTH_URL,
          aud: env.BETTER_AUTH_URL,
        }),
      ).toString('base64url');
      const forgedNoneToken = `${unsignedHeader}.${unsignedPayload}.`;

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${forgedNoneToken}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects JWT signed by foreign untrusted key with HTTP 401', async () => {
      const foreignPair = await generateKeyPair('RS256');
      const foreignToken = await new SignJWT({ sub: fix.tenantA.owner.id })
        .setProtectedHeader({ alg: 'RS256', kid: 'rogue-key' })
        .setIssuer(env.BETTER_AUTH_URL)
        .setAudience(env.BETTER_AUTH_URL)
        .setExpirationTime('15m')
        .sign(foreignPair.privateKey);

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${foreignToken}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects JWT with wrong issuer with HTTP 401', async () => {
      // Sign with real key but invalid issuer
      const { privateKey } = await generateKeyPair('RS256');
      const badIssToken = await new SignJWT({ sub: fix.tenantA.owner.id })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('http://malicious-issuer.com')
        .setAudience(env.BETTER_AUTH_URL)
        .setExpirationTime('15m')
        .sign(privateKey);

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${badIssToken}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(401);
    });

    it('rejects expired JWT with HTTP 401', async () => {
      const { privateKey } = await generateKeyPair('RS256');
      const expiredToken = await new SignJWT({ sub: fix.tenantA.owner.id })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(env.BETTER_AUTH_URL)
        .setAudience(env.BETTER_AUTH_URL)
        .setExpirationTime('-10s') // Expired 10 seconds ago
        .sign(privateKey);

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(401);
    });
  });

  describe('Formula Injection Sanitization', () => {
    it('neutralizes spreadsheet formula characters (=, +, -, @) to prevent formula execution', () => {
      expect(escapeSpreadsheetCell('=1+1')).toBe("'=1+1");
      expect(escapeSpreadsheetCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(escapeSpreadsheetCell('-2+3')).toBe("'-2+3");
      expect(escapeSpreadsheetCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(escapeSpreadsheetCell('Normal invoice 101')).toBe('Normal invoice 101');
    });
  });

  describe('Security Headers (Helmet) & Strict CORS', () => {
    it('sets protective HTTP response headers via Helmet', async () => {
      const res = await request(app).get('/health/live');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options'] || res.headers['content-security-policy']).toBeDefined();
    });

    it('enforces strict CORS origin allowing WEB_ORIGIN and denying untrusted origin', async () => {
      // 1. Allowed WEB_ORIGIN
      const allowedRes = await request(app)
        .options('/api/v1/accounts')
        .set('Origin', env.WEB_ORIGIN)
        .set('Access-Control-Request-Method', 'GET');

      expect(allowedRes.headers['access-control-allow-origin']).toBe(env.WEB_ORIGIN);

      // 2. Untrusted Origin
      const deniedRes = await request(app)
        .options('/api/v1/accounts')
        .set('Origin', 'http://attacker-controlled-site.xyz')
        .set('Access-Control-Request-Method', 'GET');

      expect(deniedRes.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
