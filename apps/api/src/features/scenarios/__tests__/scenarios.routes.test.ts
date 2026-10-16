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

describe('B13 Scenario Permissions & Tenant Isolation', () => {
  useTestDb();
  const app = createApp();

  const tenantA = 'tenant_scenarios_perms_a';
  const tenantB = 'tenant_scenarios_perms_b';

  const ownerA = 'usr_owner_a';
  const employeeA = 'usr_employee_a';
  const reviewerA = 'usr_reviewer_a';

  const ownerB = 'usr_owner_b';

  let tokenOwnerA: string;
  let tokenEmployeeA: string;
  let tokenReviewerA: string;
  let tokenOwnerB: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantA, ownerA, 'owner');
    await seedTestMember(tenantA, employeeA, 'employee');
    await seedTestMember(tenantA, reviewerA, 'reviewer');
    await seedTestMember(tenantB, ownerB, 'owner');

    tokenOwnerA = await issueTestToken(ownerA);
    tokenEmployeeA = await issueTestToken(employeeA);
    tokenReviewerA = await issueTestToken(reviewerA);
    tokenOwnerB = await issueTestToken(ownerB);

    await seedAnchorTenant(tenantA);
    await seedAnchorTenant(tenantB);
  });

  const scenarioPayload: CreateScenarioInput = {
    name: 'Move invoice scenario',
    changes: [
      {
        type: 'move_receipt',
        invoiceExternalId: 'INV-AR-LATE',
        newExpectedSettlementOn: '2026-10-30',
      },
    ],
  };

  it('employee can create scenario (201)', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenEmployeeA}`)
      .set('X-Tenant-Id', tenantA)
      .send(scenarioPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.scenarioId).toBeDefined();
  });

  it('reviewer CANNOT create scenario (403)', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenReviewerA}`)
      .set('X-Tenant-Id', tenantA)
      .send(scenarioPayload);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Insufficient permissions');
  });

  it('reviewer CAN read scenarios (GET / and GET /:id)', async () => {
    // 1. Create with owner
    const createRes = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-Id', tenantA)
      .send(scenarioPayload);

    const scenarioId = createRes.body.data.scenarioId;

    // 2. Read with reviewer
    const getRes = await request(app)
      .get(`/api/v1/scenarios/${scenarioId}`)
      .set('Authorization', `Bearer ${tokenReviewerA}`)
      .set('X-Tenant-Id', tenantA);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(scenarioId);

    const listRes = await request(app)
      .get('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenReviewerA}`)
      .set('X-Tenant-Id', tenantA);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('strictly enforces tenant isolation across all scenario routes', async () => {
    // 1. Create scenario in Tenant A
    const createRes = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-Id', tenantA)
      .send(scenarioPayload);

    const scenarioIdA = createRes.body.data.scenarioId;

    // 2. Tenant B attempts to read Tenant A scenario by ID -> 404
    const crossTenantGet = await request(app)
      .get(`/api/v1/scenarios/${scenarioIdA}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('X-Tenant-Id', tenantB);

    expect(crossTenantGet.status).toBe(404);

    // 3. Tenant B lists scenarios -> Tenant A scenario is not returned
    const listResB = await request(app)
      .get('/api/v1/scenarios')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('X-Tenant-Id', tenantB);

    expect(listResB.status).toBe(200);
    const found = listResB.body.data.some((s: { id: string }) => s.id === scenarioIdA);
    expect(found).toBe(false);
  });
});
