import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, vi } from 'vitest';
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
import { counterpartiesRepository } from '../../counterparties/counterparties.repository.js';
import { ledgerRepository } from '../../ledger/ledger.repository.js';
import { invoicesRepository } from '../../invoices/invoices.repository.js';
import { auditRepository } from '../../audit/audit.repository.js';
import { eventsRepository } from '../../events/events.repository.js';
import { ImportModel } from '../imports.model.js';
import { auditService } from '../../audit/audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../engine/__tests__/fixtures');
const TX_CLEAN = path.join(FIXTURES_DIR, 'transactions-clean.csv');
const INV_CLEAN = path.join(FIXTURES_DIR, 'invoices-clean.csv');

describe('Imports commit, deduplication, and rollback tests', () => {
  useTestDb();
  const app = createApp();

  const ownerId = 'usr_commit_owner';
  let ownerToken: string;

  beforeAll(async () => {
    await setupTestAuth();
    ownerToken = await issueTestToken(ownerId);
  });

  async function setupTenant(tenantId: string) {
    await seedTestMember(tenantId, ownerId, 'owner');
    await tenantsRepository.upsertDefaults(tenantId);
    await accountsRepository.create(tenantId, {
      code: 'OPERATING',
      name: 'Main Operating Account',
      openingBalanceMinor: 10000000,
      openingBalanceDate: '2026-01-01',
    });
  }

  it('commits transactions CSV, updates ledger, bumps datasetVersion, writes audit and event', async () => {
    const tenantId = 't_commit_tx';
    await setupTenant(tenantId);

    // 1. Preview
    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(prevRes.status).toBe(200);
    const importId = prevRes.body.data.importId;

    const beforeTenant = await tenantsRepository.findByTenantId(tenantId);
    const versionBefore = beforeTenant!.datasetVersion;

    // 2. Commit
    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('committed');
    expect(commitRes.body.data.committedAt).toBeDefined();

    // 3. Staged rows cleared in DB
    const importDoc = await ImportModel.findById(importId).lean();
    expect(importDoc!.stagedRows).toBeUndefined();

    // 4. Ledger entries created
    const { items: ledgerEntries, total } = await ledgerRepository.list(tenantId, {});
    expect(total).toBe(8);
    expect(ledgerEntries.every((e) => e.sourceImportId === importId)).toBe(true);

    // 5. datasetVersion bumped by 1
    const afterTenant = await tenantsRepository.findByTenantId(tenantId);
    expect(afterTenant!.datasetVersion).toBe(versionBefore + 1);

    // 6. Audit event recorded
    const { items: auditEvents } = await auditRepository.list(tenantId, {});
    const commitAudit = auditEvents.find((e) => e.action === 'import.commit');
    expect(commitAudit).toBeDefined();
    expect(commitAudit!.reasonCode).toBe('USER_COMMIT');
    expect(commitAudit!.resourceRefs).toContain(`import:${importId}`);

    // 7. Domain event published
    const events = await eventsRepository.listAfter(tenantId, 0, 10);
    const importEvent = events.find((e) => e.kind === 'import.committed');
    expect(importEvent).toBeDefined();
    expect(importEvent!.publicSummary).toContain('Imported 8 transactions');
  });

  it('exact re-upload of same committed file returns 409 Conflict with existing import id', async () => {
    const tenantId = 't_commit_dedupe';
    await setupTenant(tenantId);

    // First upload and commit
    const firstPrev = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);
    expect(firstPrev.status).toBe(200);
    const firstImportId = firstPrev.body.data.importId;

    const firstCommit = await request(app)
      .post(`/api/v1/imports/${firstImportId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);
    expect(firstCommit.status).toBe(200);

    // Second upload of the exact same transactions CSV
    const secondPrev = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);
    expect(secondPrev.status).toBe(200);
    const secondImportId = secondPrev.body.data.importId;

    // Attempt to commit second upload
    const secondCommit = await request(app)
      .post(`/api/v1/imports/${secondImportId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(secondCommit.status).toBe(409);
    expect(secondCommit.body.error.code).toBe('CONFLICT');
    expect(secondCommit.body.error.message).toContain('already been imported');
    expect(secondCommit.body.error.details[0].existingImportId).toBe(firstImportId);

    // Total ledger entries must remain 8 (zero duplicate records created)
    const { total } = await ledgerRepository.list(tenantId, {});
    expect(total).toBe(8);
  });

  it('reordered file with same rows creates zero new records and totals remain identical', async () => {
    const tenantId = 't_commit_reorder';
    await setupTenant(tenantId);

    // First upload and commit original file
    const firstPrev = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);
    expect(firstPrev.status).toBe(200);

    const firstCommit = await request(app)
      .post(`/api/v1/imports/${firstPrev.body.data.importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);
    expect(firstCommit.status).toBe(200);

    // Create a reordered version of the CSV (reverse the data rows)
    const reorderedCsv = [
      'externalId,date,accountId,amount,currency,category,description',
      'TXN-008,2026-10-08,OPERATING,-2000.00,CNY,other_expense,Maintenance costs',
      'TXN-007,2026-10-07,OPERATING,15000.00,CNY,other_income,Equipment rental income',
      'TXN-006,2026-10-06,OPERATING,-3500.00,CNY,tax,Quarterly tax payment',
      'TXN-005,2026-10-05,OPERATING,-8000.00,CNY,overhead,Utilities and office supplies',
      'TXN-004,2026-10-04,OPERATING,-12000.00,CNY,rent,Office rent October',
      'TXN-003,2026-10-03,OPERATING,-45000.00,CNY,payroll,October payroll',
      'TXN-002,2026-10-02,OPERATING,-25000.00,CNY,supplier_payment,Payment to Supplier B',
      'TXN-001,2026-10-01,OPERATING,50000.00,CNY,customer_receipt,Payment from Customer A',
    ].join('\n');

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', Buffer.from(reorderedCsv), 'reordered.csv');

    expect(prevRes.status).toBe(200);
    const reorderedImportId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/v1/imports/${reorderedImportId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);

    // Ledger count is STILL 8 (upserted by externalId, zero new rows)
    const { items: allEntries, total } = await ledgerRepository.list(tenantId, {});
    expect(total).toBe(8);

    const sum = allEntries.reduce((acc, e) => acc + e.amountMinor, 0);
    expect(sum).toBe(-3050000);
  });

  it('commits invoices CSV and auto-creates missing counterparties with masked names', async () => {
    const tenantId = 't_commit_invoices';
    await setupTenant(tenantId);

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'invoices')
      .attach('file', INV_CLEAN);

    expect(prevRes.status).toBe(200);
    const invImportId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/v1/imports/${invImportId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);

    // Check counterparties auto-created
    const cpList = await counterpartiesRepository.list(tenantId);
    expect(cpList.length).toBeGreaterThanOrEqual(4);

    const customerA = cpList.find((c) => c.externalId === 'CUSTOMER-A');
    expect(customerA).toBeDefined();
    expect(customerA!.type).toBe('customer');
    expect(customerA!.maskedName).toBe('Customer CUSTOMER-A');

    const supplierA = cpList.find((c) => c.externalId === 'SUPPLIER-A');
    expect(supplierA).toBeDefined();
    expect(supplierA!.type).toBe('vendor');
    expect(supplierA!.maskedName).toBe('Vendor SUPPLIER-A');

    // Check invoices created
    const invList = await invoicesRepository.list(tenantId);
    expect(invList.length).toBe(5);
  });

  it('rolls back steps 3 and 4 if step 5 fails in commit transaction', async () => {
    const freshTenant = 't_commit_rollback';
    await setupTenant(freshTenant);

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', freshTenant)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    const importId = prevRes.body.data.importId;

    // Spy on auditService.record to simulate failure during step 5
    const auditSpy = vi.spyOn(auditService, 'record').mockRejectedValueOnce(
      new Error('Simulated audit persistence crash'),
    );

    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', freshTenant);

    expect(commitRes.status).toBe(500);

    auditSpy.mockRestore();

    // Verify transaction rolled back:
    const doc = await ImportModel.findById(importId).lean();
    expect(doc!.status).toBe('previewed');
    expect(doc!.stagedRows).toBeDefined();

    const { total } = await ledgerRepository.list(freshTenant, {});
    expect(total).toBe(0);
  });
});
