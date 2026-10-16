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
import { ImportModel } from '../imports.model.js';

describe('Imports edge validation, tenant isolation, and history tests', () => {
  useTestDb();
  const app = createApp();

  const ownerId = 'usr_hist_owner';
  const ownerBId = 'usr_hist_owner_b';

  let ownerToken: string;
  let ownerBToken: string;

  beforeAll(async () => {
    await setupTestAuth();
    ownerToken = await issueTestToken(ownerId);
    ownerBToken = await issueTestToken(ownerBId);
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

  it('rejects commit with 400 when transactions reference a non-existent account', async () => {
    const tenantId = 't_hist_missing_acc';
    await setupTenant(tenantId);

    const invalidAccountCsv = [
      'externalId,date,accountId,amount,currency,category,description',
      'TXN-999,2026-10-01,UNKNOWN_ACC,1000.00,CNY,customer_receipt,Test',
    ].join('\n');

    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', Buffer.from(invalidAccountCsv), 'invalid_acc.csv');

    expect(prevRes.status).toBe(200);
    const importId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(400);
    expect(commitRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(commitRes.body.error.message).toContain('UNKNOWN_ACC');
  });

  it('rejects commit with 409 Conflict if preview has expired', async () => {
    const tenantId = 't_hist_expired';
    await setupTenant(tenantId);

    const expiredDoc = await ImportModel.create({
      tenantId,
      kind: 'transactions',
      fileName: 'expired.csv',
      checksum: 'sha256-expired-preview',
      mappingVersion: 1,
      status: 'previewed',
      rowCount: 1,
      acceptedRows: 1,
      rejectedRows: 0,
      errors: [],
      stagedRows: [],
      actorId: ownerId,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    const commitRes = await request(app)
      .post(`/api/v1/imports/${expiredDoc._id}/commit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(409);
    expect(commitRes.body.error.code).toBe('CONFLICT');
    expect(commitRes.body.error.message).toContain('expired');
  });

  it('enforces tenant isolation: other tenant receives 404 for another tenant import id', async () => {
    const tenantA = 't_hist_iso_a';
    const tenantB = 't_hist_iso_b';
    await setupTenant(tenantA);
    await seedTestMember(tenantB, ownerBId, 'owner');

    const doc = await ImportModel.create({
      tenantId: tenantA,
      kind: 'transactions',
      fileName: 'tenant_a.csv',
      checksum: 'sha256-tenant-a',
      mappingVersion: 1,
      status: 'previewed',
      rowCount: 1,
      acceptedRows: 1,
      rejectedRows: 0,
      errors: [],
      actorId: ownerId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // Tenant B tries to commit Tenant A's import
    const commitRes = await request(app)
      .post(`/api/v1/imports/${doc._id}/commit`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .set('X-Tenant-Id', tenantB);

    expect(commitRes.status).toBe(404);
    expect(commitRes.body.error.code).toBe('NOT_FOUND');

    // Tenant B tries to get Tenant A's import
    const getRes = await request(app)
      .get(`/api/v1/imports/${doc._id}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .set('X-Tenant-Id', tenantB);

    expect(getRes.status).toBe(404);
  });

  it('lists imports paginated for the authenticated tenant', async () => {
    const tenantId = 't_hist_list';
    await setupTenant(tenantId);

    await ImportModel.create({
      tenantId,
      kind: 'transactions',
      fileName: 'history.csv',
      checksum: 'sha256-history',
      mappingVersion: 1,
      status: 'previewed',
      rowCount: 5,
      acceptedRows: 5,
      rejectedRows: 0,
      errors: [],
      actorId: ownerId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .get('/api/v1/imports?page=1&pageSize=10')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(10);
  });

  it('exports error report CSV with dangerous spreadsheet formula injection cells escaped', async () => {
    const tenantId = 't_hist_error_report';
    await setupTenant(tenantId);

    const docWithErrors = await ImportModel.create({
      tenantId,
      kind: 'invoices',
      fileName: 'formula_injection.csv',
      checksum: 'sha256-formula-test',
      mappingVersion: 1,
      status: 'rejected',
      rowCount: 3,
      acceptedRows: 0,
      rejectedRows: 3,
      errors: [
        { row: 2, field: '=cmd| /C calc', message: '+12345' },
        { row: 3, field: '@SUM(A1:B1)', message: '-500.00' },
        { row: 4, field: '\tTAB_CELL', message: '\rRETURN_CELL' },
      ],
      actorId: ownerId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .get(`/api/v1/imports/${docWithErrors._id}/errors.csv`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="import-${docWithErrors._id}-errors.csv"`,
    );

    const csvText = res.text;
    expect(csvText).toContain('row,field,message');
    // Dangerous prefixes neutralized with leading single quote:
    expect(csvText).toContain("'=cmd| /C calc");
    expect(csvText).toContain("'+12345");
    expect(csvText).toContain("'@SUM(A1:B1)");
    expect(csvText).toContain("'-500.00");
    expect(csvText).toContain("'\tTAB_CELL");
    expect(csvText).toContain("'\rRETURN_CELL");
  });
});
