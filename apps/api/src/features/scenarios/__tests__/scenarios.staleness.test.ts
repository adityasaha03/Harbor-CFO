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
import { tenantsRepository } from '../../tenants';
import type { CreateScenarioInput } from '@harbor/contracts';

describe('B13 Scenario Staleness Detection', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'tenant_harbor_scenarios_staleness';
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

  it('marks scenario as stale when tenant datasetVersion is bumped', async () => {
    const payload: CreateScenarioInput = {
      name: 'Staleness test scenario',
      changes: [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-30',
        },
      ],
    };

    // 1. Create scenario
    const createRes = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(payload);

    expect(createRes.status).toBe(201);
    const scenarioId = createRes.body.data.scenarioId;
    expect(createRes.body.data.isStale).toBe(false);

    // 2. Fetch scenario initially -> isStale must be false
    const initialGet = await request(app)
      .get(`/api/v1/scenarios/${scenarioId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(initialGet.status).toBe(200);
    expect(initialGet.body.data.baseInputVersion).toBe(1);
    expect(initialGet.body.data.isStale).toBe(false);

    // 3. Bump tenant dataset version (e.g. from new CSV import or ledger update)
    const newVersion = await tenantsRepository.bumpDatasetVersion(tenantId);
    expect(newVersion).toBe(2);

    // 4. Fetch scenario again -> isStale must now be true!
    const staleGet = await request(app)
      .get(`/api/v1/scenarios/${scenarioId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(staleGet.status).toBe(200);
    expect(staleGet.body.data.isStale).toBe(true);

    // 5. Also verify list endpoint reflects staleness
    const listRes = await request(app)
      .get('/api/v1/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(listRes.status).toBe(200);
    const item = listRes.body.data.find((s: { id: string }) => s.id === scenarioId);
    expect(item).toBeDefined();
    expect(item.isStale).toBe(true);
  });
});
