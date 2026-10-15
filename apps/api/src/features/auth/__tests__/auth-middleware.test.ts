import { describe, it, expect, beforeAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { env } from '../../../config/env';
import { UnauthenticatedError, ForbiddenError } from '../../../core/http/app-error';
import { authenticate } from '../authenticate.middleware';
import { tenantContext } from '../tenant-context.middleware';
import { requirePermission, protect, protectMember } from '../require-permission.middleware';
import { setRemoteJwksForTesting } from '../jwt-verifier';

describe('Auth middlewares unit tests', () => {
  useTestDb();

  let validToken: string;
  let privateKey: Parameters<SignJWT['sign']>[0];

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'test-middleware-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);

    validToken = await new SignJWT({ sub: 'user_m_01' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-middleware-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime('15m')
      .sign(privateKey);
  });

  function createMockReqRes(headers: Record<string, string> = {}): {
    req: Request;
    res: Response;
    next: NextFunction;
    nextCalledWith: () => unknown;
  } {
    let capturedErr: unknown;
    const req = {
      headers: { ...headers },
    } as unknown as Request;

    const res = {} as unknown as Response;
    const next: NextFunction = (err?: unknown) => {
      capturedErr = err;
    };

    return {
      req,
      res,
      next,
      nextCalledWith: () => capturedErr,
    };
  }

  describe('authenticate', () => {
    it('rejects missing Authorization header', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes();
      await authenticate(req, res, next);

      expect(nextCalledWith()).toBeInstanceOf(UnauthenticatedError);
    });

    it('rejects malformed Authorization header not starting with Bearer', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes({
        authorization: 'Basic dXNlcjpwYXNz',
      });
      await authenticate(req, res, next);

      expect(nextCalledWith()).toBeInstanceOf(UnauthenticatedError);
    });

    it('rejects empty bearer token', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes({
        authorization: 'Bearer   ',
      });
      await authenticate(req, res, next);

      expect(nextCalledWith()).toBeInstanceOf(UnauthenticatedError);
    });

    it('populates req.auth on valid bearer token', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes({
        authorization: `Bearer ${validToken}`,
      });
      await authenticate(req, res, next);

      expect(nextCalledWith()).toBeUndefined();
      expect(req.auth).toBeDefined();
      expect(req.auth?.userId).toBe('user_m_01');
      expect(req.auth?.token).toBe(validToken);
      expect(req.auth?.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('tenantContext', () => {
    it('rejects if req.auth is missing', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes({
        'x-tenant-id': 'org_t_01',
      });
      await tenantContext(req, res, next);

      expect(nextCalledWith()).toBeInstanceOf(UnauthenticatedError);
    });

    it('rejects if X-Tenant-Id header is missing', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes();
      req.auth = {
        userId: 'user_m_01',
        token: validToken,
        expiresAt: new Date(Date.now() + 60000),
      };

      await tenantContext(req, res, next);
      const err = nextCalledWith() as ForbiddenError;
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err.message).toBe('Not a member of this company');
    });

    it('rejects with identical ForbiddenError if tenant is not in database', async () => {
      const { req, res, next, nextCalledWith } = createMockReqRes({
        'x-tenant-id': 'org_unregistered',
      });
      req.auth = {
        userId: 'user_m_01',
        token: validToken,
        expiresAt: new Date(Date.now() + 60000),
      };

      await tenantContext(req, res, next);
      const err = nextCalledWith() as ForbiddenError;
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err.message).toBe('Not a member of this company');
    });

    it('populates req.actor on valid membership', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        id: 'org_real_01',
        name: 'Harbor Real',
      });
      await db.collection('member').insertOne({
        userId: 'user_m_01',
        organizationId: 'org_real_01',
        role: 'owner',
      });

      const { req, res, next, nextCalledWith } = createMockReqRes({
        'x-tenant-id': 'org_real_01',
        'x-request-id': 'req-test-1234',
      });
      req.auth = {
        userId: 'user_m_01',
        token: validToken,
        expiresAt: new Date(Date.now() + 60000),
      };

      await tenantContext(req, res, next);
      expect(nextCalledWith()).toBeUndefined();
      expect(req.actor).toBeDefined();
      expect(req.actor?.userId).toBe('user_m_01');
      expect(req.actor?.tenantId).toBe('org_real_01');
      expect(req.actor?.role).toBe('owner');
      expect(req.actor?.requestId).toBe('req-test-1234');
    });
  });

  describe('requirePermission', () => {
    it('denies access if req.actor is missing', () => {
      const { req, res, next, nextCalledWith } = createMockReqRes();
      const mw = requirePermission('finance:read');
      mw(req, res, next);

      expect(nextCalledWith()).toBeInstanceOf(ForbiddenError);
    });

    it('grants access when role holds the requested permission', () => {
      const { req, res, next, nextCalledWith } = createMockReqRes();
      req.actor = {
        userId: 'user_m_01',
        tenantId: 'org_real_01',
        role: 'owner',
        requestId: 'req-01',
      };

      const mw = requirePermission('settings:manage');
      mw(req, res, next);

      expect(nextCalledWith()).toBeUndefined();
    });

    it('denies access when role lacks the permission and logs warning', () => {
      const { req, res, next, nextCalledWith } = createMockReqRes();
      req.actor = {
        userId: 'user_m_02',
        tenantId: 'org_real_01',
        role: 'reviewer',
        requestId: 'req-02',
      };

      const mw = requirePermission('actions:approve');
      mw(req, res, next);

      const err = nextCalledWith() as ForbiddenError;
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err.message).toBe('Insufficient permissions');
    });
  });

  describe('protect helpers', () => {
    it('protect helper exports 3 middlewares in correct order', () => {
      const pipeline = protect('finance:read');
      expect(pipeline).toHaveLength(3);
      expect(typeof pipeline[0]).toBe('function');
      expect(typeof pipeline[1]).toBe('function');
      expect(typeof pipeline[2]).toBe('function');
    });

    it('protectMember helper exports authenticate and tenantContext middlewares', () => {
      const pipeline = protectMember();
      expect(pipeline).toHaveLength(2);
      expect(typeof pipeline[0]).toBe('function');
      expect(typeof pipeline[1]).toBe('function');
    });
  });
});
