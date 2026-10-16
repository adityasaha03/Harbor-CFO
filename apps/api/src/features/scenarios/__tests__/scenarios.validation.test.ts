import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from '../../../test-utils/test-auth-helper';
import { seedAnchorTenant } from './fixtures/seed-anchor';
import type { CreateScenarioInput } from '@harbor/contracts';

describe('B13 Scenario Validation Tests', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'tenant_harbor_scenarios_validation';
  const userId = 'usr_harbor_owner';
  let token: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantId, userId, 'owner');
    token = await issueTestToken(userId);
    await seedAnchorTenant(tenantId);
  });

  it('fails with 400 when invoice is unknown', async () => {
    const payload: CreateScenarioInput = {
      name: 'Unknown invoice',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-DOES-NOT-EXIST',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not found');
  });

  it('fails with 400 when invoice is already paid', async () => {
    const payload: CreateScenarioInput = {
      name: 'Paid invoice',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-PAID',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already paid');
  });

  it('fails with 400 when move_receipt targets an AP invoice', async () => {
    const payload: CreateScenarioInput = {
      name: 'AP invoice in move_receipt',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AP-201',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not an AR invoice');
  });

  it('fails with 400 when date is outside the horizon (on or before asOfDate)', async () => {
    const payload: CreateScenarioInput = {
      name: 'Date before day 1',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-20', // day 0 = asOfDate
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('between day 1 and the end of the forecast horizon');
  });

  it('fails with 400 when date is beyond the 91-day horizon', async () => {
    const payload: CreateScenarioInput = {
      name: 'Date beyond horizon',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2027-02-01', // day > 91
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('between day 1 and the end of the forecast horizon');
  });

  it('fails with 400 when defer_payment is missing an assumption', async () => {
    const payload = {
      name: 'Missing assumption',
      changes: [
        {
          type: 'defer_payment',
          invoiceExternalId: 'INV-AP-201',
          newExpectedSettlementOn: '2026-11-15',
          assumption: '   ',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
  });

  it('fails with 400 when add_financing principal violates offer range', async () => {
    const payload: CreateScenarioInput = {
      name: 'Offer range violation',
      changes: [
        {
          type: 'add_financing',
          offerCode: 'revolver-flex',
          principalMinor: 100_000, // 1,000 CNY < min 5,000 CNY (500,000 fen)
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('outside offer range');
  });

  it('fails with 400 when financing offer does not exist in catalog', async () => {
    const payload: CreateScenarioInput = {
      name: 'Unknown offer',
      changes: [
        {
          type: 'add_financing',
          offerCode: 'non-existent-loan',
          principalMinor: 5_000_000,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not found in catalog');
  });
});
