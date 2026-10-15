import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { withTransaction } from '../../../core/db/with-transaction';
import { env } from '../../../config/env';
import { setRemoteJwksForTesting } from '../../auth/jwt-verifier';
import { auditService } from '../audit.service';
import { AuditEventModel } from '../audit.model';

describe('Audit feature tests (Service, Model, Repo, HTTP & Denial Hooks)', () => {
  useTestDb();

  let privateKey: Parameters<SignJWT['sign']>[0];
  const app = createApp();

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'audit-test-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);
  });

  async function issueToken(userId: string): Promise<string> {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: 'audit-test-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime('15m')
      .sign(privateKey);
  }

  describe('auditService.record and transactions', () => {
    it('records an audit event with all attributes', async () => {
      const record = await auditService.record({
        tenantId: 'org_audit_01',
        actorId: 'usr_owner_01',
        actorRole: 'owner',
        action: 'import.commit',
        decision: 'allowed',
        reasonCode: 'SUCCESS',
        resourceRefs: ['imp_001', 'inv_002'],
        payloadHash: 'hash_abc123',
        beforeVersion: 1,
        afterVersion: 2,
        traceId: 'trace-111',
      });

      expect(record.id).toBeDefined();
      expect(record.tenantId).toBe('org_audit_01');
      expect(record.actorId).toBe('usr_owner_01');
      expect(record.actorRole).toBe('owner');
      expect(record.action).toBe('import.commit');
      expect(record.decision).toBe('allowed');
      expect(record.resourceRefs).toEqual(['imp_001', 'inv_002']);
      expect(record.beforeVersion).toBe(1);
      expect(record.afterVersion).toBe(2);
      expect(record.traceId).toBe('trace-111');
      expect(record.createdAt).toBeDefined();
    });

    it('successfully participates in a database transaction and commits', async () => {
      await withTransaction(async (session) => {
        await auditService.record(
          {
            tenantId: 'org_audit_tx_1',
            action: 'financing.approve',
            decision: 'allowed',
            reasonCode: 'OWNER_APPROVAL',
            resourceRefs: ['prop_01'],
            traceId: 'trace-tx-1',
          },
          session,
        );
      });

      const events = await auditService.list('org_audit_tx_1');
      expect(events.total).toBe(1);
      expect(events.items[0]?.action).toBe('financing.approve');
    });

    it('rolls back audit recording if transaction aborts', async () => {
      await expect(
        withTransaction(async (session) => {
          await auditService.record(
            {
              tenantId: 'org_audit_tx_2',
              action: 'action.execute',
              decision: 'allowed',
              reasonCode: 'EXECUTED',
              resourceRefs: [],
              traceId: 'trace-tx-2',
            },
            session,
          );
          throw new Error('Transaction failure simulation');
        }),
      ).rejects.toThrow('Transaction failure simulation');

      const events = await auditService.list('org_audit_tx_2');
      expect(events.total).toBe(0);
    });
  });

  describe('auditService.list and tenant isolation', () => {
    it('isolates audit events strictly between tenants and sorts newest first', async () => {
      // Seed tenant A
      await auditService.record({
        tenantId: 'tenant_A',
        action: 'event.A1',
        decision: 'allowed',
        reasonCode: 'CODE_1',
        traceId: 'tr_A1',
      });
      // slight delay to test ordering
      await new Promise((r) => setTimeout(r, 10));
      await auditService.record({
        tenantId: 'tenant_A',
        action: 'event.A2',
        decision: 'denied',
        reasonCode: 'CODE_2',
        traceId: 'tr_A2',
      });

      // Seed tenant B
      await auditService.record({
        tenantId: 'tenant_B',
        action: 'event.B1',
        decision: 'allowed',
        reasonCode: 'CODE_B',
        traceId: 'tr_B1',
      });

      const listA = await auditService.list('tenant_A');
      expect(listA.total).toBe(2);
      expect(listA.items[0]?.action).toBe('event.A2');
      expect(listA.items[1]?.action).toBe('event.A1');

      const listB = await auditService.list('tenant_B');
      expect(listB.total).toBe(1);
      expect(listB.items[0]?.action).toBe('event.B1');
    });

    it('handles pagination (page, pageSize)', async () => {
      for (let i = 1; i <= 5; i++) {
        await auditService.record({
          tenantId: 'tenant_page_test',
          action: `action_${i}`,
          decision: 'allowed',
          reasonCode: `CODE_${i}`,
          traceId: `tr_${i}`,
        });
      }

      const page1 = await auditService.list('tenant_page_test', { page: 1, pageSize: 2 });
      expect(page1.total).toBe(5);
      expect(page1.items.length).toBe(2);
      expect(page1.page).toBe(1);

      const page3 = await auditService.list('tenant_page_test', { page: 3, pageSize: 2 });
      expect(page3.items.length).toBe(1);
    });
  });

  describe('GET /api/v1/audit-events HTTP endpoint', () => {
    it('returns 401 when no authorization token is supplied', async () => {
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('X-Tenant-Id', 'org_http_01');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 when caller has employee or reviewer role (lacks audit:export)', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({ id: 'org_perm_audit', name: 'Perm Org' });
      await db.collection('member').insertOne({
        userId: 'usr_emp_audit',
        organizationId: 'org_perm_audit',
        role: 'employee',
      });

      const token = await issueToken('usr_emp_audit');
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', 'org_perm_audit');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 with paginated events for owner (has audit:export)', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({ id: 'org_owner_audit', name: 'Owner Org' });
      await db.collection('member').insertOne({
        userId: 'usr_owner_audit',
        organizationId: 'org_owner_audit',
        role: 'owner',
      });

      await auditService.record({
        tenantId: 'org_owner_audit',
        action: 'settings.update',
        decision: 'allowed',
        reasonCode: 'SUCCESS',
        traceId: 'trace-test-http',
      });

      const token = await issueToken('usr_owner_audit');
      const res = await request(app)
        .get('/api/v1/audit-events?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', 'org_owner_audit');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe('settings.update');
      expect(res.body.meta).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('Denial hooks wiring', () => {
    it('records permission.denied audit log when action is denied by permission middleware', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({ id: 'org_denial_01', name: 'Denial Org' });
      await db.collection('member').insertOne({
        userId: 'usr_reviewer_audit',
        organizationId: 'org_denial_01',
        role: 'reviewer',
      });

      const token = await issueToken('usr_reviewer_audit');

      // Reviewer tries to access audit-events (which requires audit:export)
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', 'org_denial_01');

      expect(res.status).toBe(403);

      // Verify that audit log was recorded
      const logs = await AuditEventModel.find({
        tenantId: 'org_denial_01',
        action: 'permission.denied',
      }).lean();

      expect(logs.length).toBe(1);
      expect(logs[0]?.decision).toBe('denied');
      expect(logs[0]?.reasonCode).toBe('MISSING_PERMISSION');
      expect(logs[0]?.resourceRefs).toContain('audit:export');
      expect(logs[0]?.actorRole).toBe('reviewer');
    });

    it('records membership.denied audit log when user is not a member of the requested company', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({ id: 'org_target_01', name: 'Target Org' });
      // User is NOT added to member collection for org_target_01

      const token = await issueToken('usr_intruder_01');

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', 'org_target_01');

      expect(res.status).toBe(403);

      const logs = await AuditEventModel.find({
        tenantId: 'org_target_01',
        action: 'membership.denied',
      }).lean();

      expect(logs.length).toBe(1);
      expect(logs[0]?.decision).toBe('denied');
      expect(logs[0]?.reasonCode).toBe('NOT_A_MEMBER');
      expect(logs[0]?.actorId).toBe('usr_intruder_01');
    });
  });
});
