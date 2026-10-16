import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { useTestDb } from '../core/db/test/mongo-test-harness';
import { setupTestAuth, seedTestMember } from '../test-utils/test-auth-helper';
import { setupTwoTenants, type SecurityTestFixtures } from './helpers';
import { ActionProposal } from '../features/actions/actions.models';
import { LedgerEntryModel } from '../features/ledger';


describe('B18 Security Suite 4: Idempotency and Concurrency Hardening', () => {
  useTestDb();
  const app = createApp();
  let fix: SecurityTestFixtures;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    fix = await setupTwoTenants();
  });

  async function createValidProposal(principalMinor = 5_000_000) {
    const res = await request(app)
      .post('/api/v1/action-proposals')
      .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
      .set('X-Tenant-Id', fix.tenantA.id)
      .send({
        actionType: 'sandbox_financing_draw',
        offerCode: 'bridge-term',
        principalMinor,
      });

    return res.body.data;
  }

  describe('Idempotency Key Requirement', () => {
    it('rejects execution request with 400 when Idempotency-Key header is missing', async () => {
      const proposal = await createValidProposal();

      // Approve it first
      await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: proposal.payloadHash });

      // Execute without Idempotency-Key
      const res = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/execute`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/Idempotency-Key/i);
    });
  });

  describe('Duplicate & Concurrent Execution Protection', () => {
    it('executes exactly once when duplicate execute calls are made with identical key', async () => {
      const proposal = await createValidProposal(6_000_000);
      const idempotencyKey = `idem_key_${Date.now()}`;

      // Approve proposal
      await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: proposal.payloadHash });

      const initialLedgerCount = await LedgerEntryModel.countDocuments({
        tenantId: fix.tenantA.id,
      });

      // First execution
      const res1 = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/execute`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .set('Idempotency-Key', idempotencyKey);

      expect(res1.status).toBe(200);

      // Duplicate execution with same Idempotency-Key
      const res2 = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/execute`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .set('Idempotency-Key', idempotencyKey);

      expect([200, 409]).toContain(res2.status);

      // Verify ledger entries increased by at most 2 (1 draw + 1 fee), never duplicated
      const finalLedgerCount = await LedgerEntryModel.countDocuments({
        tenantId: fix.tenantA.id,
      });
      expect(finalLedgerCount).toBe(initialLedgerCount + 2);
    });

    it('handles concurrent execute race conditions safely', async () => {
      const proposal = await createValidProposal(4_000_000);

      await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: proposal.payloadHash });

      const key = `race_key_${Date.now()}`;

      // Fire concurrent execute requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/v1/action-proposals/${proposal.id}/execute`)
          .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
          .set('X-Tenant-Id', fix.tenantA.id)
          .set('Idempotency-Key', key),
        request(app)
          .post(`/api/v1/action-proposals/${proposal.id}/execute`)
          .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
          .set('X-Tenant-Id', fix.tenantA.id)
          .set('Idempotency-Key', key),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      // The other is either cached 200 or 409 Conflict
      expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    });
  });

  describe('Tampered Payload Hash Protection', () => {
    it('rejects approval when payloadHash does not match the server-computed canonical hash', async () => {
      const proposal = await createValidProposal(3_000_000);

      const res = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: 'tampered_forged_hash_value' });

      expect([400, 409]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/hash mismatch|mismatch/i);
    });
  });

  describe('Expired Proposal Protection', () => {
    it('rejects approval of an expired proposal with 409 Conflict', async () => {
      const proposal = await createValidProposal(5_000_000);

      // Force expiration into the past
      await ActionProposal.updateOne(
        { _id: proposal.id },
        { $set: { expiresAt: new Date(Date.now() - 60 * 1000) } },
      );

      const res = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: proposal.payloadHash });

      expect([400, 409]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/expired/i);
    });
  });

  describe('Revoked Owner Mid-Execution Protection', () => {
    it('rejects execution with 403 when owner role is revoked prior to execution', async () => {
      const proposal = await createValidProposal(3_500_000);

      // Approve proposal
      await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: proposal.payloadHash });

      // Demote owner to reviewer in member database
      await seedTestMember(fix.tenantA.id, fix.tenantA.owner.id, 'reviewer');

      // Attempt execution
      const res = await request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/execute`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .set('Idempotency-Key', `revoked_key_${Date.now()}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');

      // Restore owner role
      await seedTestMember(fix.tenantA.id, fix.tenantA.owner.id, 'owner');
    });
  });
});
