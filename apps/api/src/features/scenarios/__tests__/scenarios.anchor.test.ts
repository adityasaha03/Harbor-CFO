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

describe('B13 Scenario Service Anchor Tests (Harbor Wholesale)', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'tenant_harbor_scenarios_anchor';
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

  it('Remedy 1: Move INV-AR-LATE to 2026-10-30 gives day-21 cash 2,000,000 fen', async () => {
    const payload: CreateScenarioInput = {
      name: 'Collect late receivable early',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(201);
    const body = res.body.data;
    expect(body.scenarioId).toBeDefined();

    // Day-21 cash should be 2,000,000 fen
    const day21 = body.cashAtDays.find((d: { day: number }) => d.day === 21);
    expect(day21.scenarioClosingMinor).toBe(2_000_000);
    expect(day21.deltaMinor).toBe(4_000_000);
    expect(body.deltas.day21CashMinor).toBe(4_000_000);
    expect(body.financing.totalCostMinor).toBe(0);
    expect(body.isStale).toBe(false);
  });

  it('Remedy 2: Bridge gives 3,880,000 and repayment warning on 2026-12-08', async () => {
    const payload: CreateScenarioInput = {
      name: 'Bridge term loan remedy',
      changes: [
        {
          type: 'add_financing',
          offerCode: 'bridge-term',
          principalMinor: 6_000_000, // 60,000 CNY
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(201);
    const body = res.body.data;

    // Day-21 cash should be 3,880,000 fen
    const day21 = body.cashAtDays.find((d: { day: number }) => d.day === 21);
    expect(day21.scenarioClosingMinor).toBe(3_880_000);

    // Total borrowing cost: 300,000 fen (3,000 CNY)
    expect(body.financing.totalCostMinor).toBe(300_000);
    expect(body.financing.principalMinor).toBe(6_000_000);
    expect(body.financing.netProceedsMinor).toBe(5_880_000);
    expect(body.financing.repaymentsTotalMinor).toBe(6_180_000);

    // Repayment warning: first below floor after funding on 2026-12-08
    expect(body.financing.repaymentWarnings).toHaveLength(1);
    expect(body.financing.repaymentWarnings[0].date).toBe('2026-12-08');
  });

  it('Remedy 3: Move + revolver 1,200,000 gives 3,176,000 with total cost 42,000', async () => {
    const payload: CreateScenarioInput = {
      name: 'Move invoice + small revolving credit draw',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-30',
        },
        {
          type: 'add_financing',
          offerCode: 'revolver-flex',
          principalMinor: 1_200_000, // 12,000 CNY
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(res.status).toBe(201);
    const body = res.body.data;

    // Day-21 cash should be 3,176,000 fen
    const day21 = body.cashAtDays.find((d: { day: number }) => d.day === 21);
    expect(day21.scenarioClosingMinor).toBe(3_176_000);

    // Total borrowing cost: 42,000 fen (420 CNY)
    expect(body.financing.totalCostMinor).toBe(42_000);
    expect(body.financing.principalMinor).toBe(1_200_000);
    expect(body.financing.netProceedsMinor).toBe(1_176_000);
    expect(body.financing.repaymentsTotalMinor).toBe(1_218_000);
  });

  it('GET /api/v1/scenarios and GET /api/v1/scenarios/:id retrieve saved scenarios with isStale: false', async () => {
    const payload: CreateScenarioInput = {
      name: 'Test scenario persistence',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    const createRes = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    const scenarioId = createRes.body.data.scenarioId;

    // GET by ID
    const getRes = await request(app)
      .get(`/api/v1/scenarios/${scenarioId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(scenarioId);
    expect(getRes.body.data.name).toBe('Test scenario persistence');
    expect(getRes.body.data.isStale).toBe(false);
    expect(getRes.body.data.comparison).toBeDefined();

    // GET list
    const listRes = await request(app)
      .get('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].id).toBe(scenarioId);
  });
});
