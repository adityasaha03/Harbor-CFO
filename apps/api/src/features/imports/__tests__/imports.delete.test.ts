import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from '../../../test-utils/test-auth-helper.js';
import { accountsRepository } from '../../accounts/accounts.repository.js';
import { tenantsRepository } from '../../tenants/tenants.repository.js';
import { ledgerRepository } from '../../ledger/ledger.repository.js';
import { invoicesRepository } from '../../invoices/invoices.repository.js';
import { auditRepository } from '../../audit/audit.repository.js';
import { eventsRepository } from '../../events/events.repository.js';
import { ImportModel } from '../imports.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../engine/__tests__/fixtures');
const TX_CLEAN = path.join(FIXTURES_DIR, 'transactions-clean.csv');
const INV_CLEAN = path.join(FIXTURES_DIR, 'invoices-clean.csv');

describe('Imports delete and rollback tests', () => {
  useTestDb();
  const app = createApp();

  const ownerId = 'usr_delete_owner';
  const employeeId = 'usr_delete_employee';
  const reviewerId = 'usr_delete_reviewer';

  let ownerToken: string;
  let employeeToken: string;
  let reviewerToken: string;

  beforeAll(async () => {
    await setupTestAuth();
    ownerToken = await issueTestToken(ownerId);
    employeeToken = await issueTestToken(employeeId);
    reviewerToken = await issueTestToken(reviewerId);
  });

  async function setupTenant(tenantId: string) {
    await seedTestMember(tenantId, ownerId, 'owner');
    await seedTestMember(tenantId, employeeId, 'employee');
    await seedTestMember(tenantId, reviewerId, 'reviewer');
    await tenantsRepository.upsertDefaults(tenantId);
    await accountsRepository.create(tenantId, {
      code: 'OPERATING',
      name: 'Main Operating Account',
      openingBalanceMinor: 10000000,
      openingBalanceDate: '2026-01-01',
    });
  }

  it('allows owner to delete committed transaction import and purges ledger entries, bumps version, records audit and event', async () => {
    const tenantId = 't_delete_tx';
    await setupTenant(tenantId);

    // 1. Preview and commit transactions
    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(prevRes.status).toBe(200);
    const importId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);

    // Verify ledger has entries
    const { total: totalBeforeDelete } = await ledgerRepository.list(tenantId, {});
    expect(totalBeforeDelete).toBe(8);

    const tenantBefore = await tenantsRepository.findByTenantId(tenantId);
    const versionBefore = tenantBefore!.datasetVersion;

    // 2. Owner deletes the import
    const deleteRes = await request(app)
      .delete(`/api/v1/imports/${importId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.data.importId).toBe(importId);

    // 3. Ledger entries associated with this import are deleted
    const { total: totalAfterDelete } = await ledgerRepository.list(tenantId, {});
    expect(totalAfterDelete).toBe(0);

    // 4. Import document itself is removed
    const importDoc = await ImportModel.findById(importId).lean();
    expect(importDoc).toBeNull();

    // 5. datasetVersion bumped
    const tenantAfter = await tenantsRepository.findByTenantId(tenantId);
    expect(tenantAfter!.datasetVersion).toBe(versionBefore + 1);

    // 6. Audit event recorded
    const { items: auditEvents } = await auditRepository.list(tenantId, {});
    const deleteAudit = auditEvents.find((e) => e.action === 'import.delete');
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.reasonCode).toBe('USER_DELETE');
    expect(deleteAudit!.resourceRefs).toContain(`import:${importId}`);

    // 7. Domain event published
    const events = await eventsRepository.listAfter(tenantId, 0, 10);
    const deleteEvent = events.find((e) => e.kind === 'import.deleted');
    expect(deleteEvent).toBeDefined();
    expect(deleteEvent!.resourceRefs).toContain(`import:${importId}`);
  });

  it('allows owner to delete committed invoices import and purges invoices', async () => {
    const tenantId = 't_delete_inv';
    await setupTenant(tenantId);

    // 1. Preview and commit invoices
    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'invoices')
      .attach('file', INV_CLEAN);

    expect(prevRes.status).toBe(200);
    const importId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);

    const invoicesBefore = await invoicesRepository.list(tenantId);
    expect(invoicesBefore.length).toBeGreaterThan(0);

    // 2. Owner deletes the import
    const deleteRes = await request(app)
      .delete(`/api/v1/imports/${importId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    // 3. Invoices associated with this import are deleted
    const invoicesAfter = await invoicesRepository.list(tenantId);
    expect(invoicesAfter.length).toBe(0);

    // 4. Import batch document is removed
    const importDoc = await ImportModel.findById(importId).lean();
    expect(importDoc).toBeNull();
  });

  it('rejects deletion attempt by employee with 403 Forbidden', async () => {
    const tenantId = 't_delete_emp';
    await setupTenant(tenantId);

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    const importId = prevRes.body.data.importId;

    const deleteRes = await request(app)
      .delete(`/api/v1/imports/${importId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(deleteRes.status).toBe(403);
  });

  it('rejects deletion attempt by reviewer with 403 Forbidden', async () => {
    const tenantId = 't_delete_rev';
    await setupTenant(tenantId);

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    const importId = prevRes.body.data.importId;

    const deleteRes = await request(app)
      .delete(`/api/v1/imports/${importId}`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(deleteRes.status).toBe(403);
  });

  it('returns 404 if import does not exist', async () => {
    const tenantId = 't_delete_404';
    await setupTenant(tenantId);

    const fakeId = '507f1f77bcf86cd799439011';
    const deleteRes = await request(app)
      .delete(`/api/v1/imports/${fakeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(deleteRes.status).toBe(404);
  });
});

