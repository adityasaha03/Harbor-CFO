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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../engine/__tests__/fixtures');
const TX_CLEAN = path.join(FIXTURES_DIR, 'transactions-clean.csv');
const INV_CLEAN = path.join(FIXTURES_DIR, 'invoices-clean.csv');
const INV_BAD = path.join(FIXTURES_DIR, 'invoices-bad.csv');

describe('Imports preview endpoint (POST /api/v1/imports/preview)', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'tenant_preview_test';
  const ownerId = 'usr_prev_owner';
  const employeeId = 'usr_prev_emp';
  const reviewerId = 'usr_prev_rev';

  let ownerToken: string;
  let employeeToken: string;
  let reviewerToken: string;

  beforeAll(async () => {
    await setupTestAuth();
    await seedTestMember(tenantId, ownerId, 'owner');
    await seedTestMember(tenantId, employeeId, 'employee');
    await seedTestMember(tenantId, reviewerId, 'reviewer');

    ownerToken = await issueTestToken(ownerId);
    employeeToken = await issueTestToken(employeeId);
    reviewerToken = await issueTestToken(reviewerId);
  });

  it('previews clean transactions CSV and stores stagedRows', async () => {
    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      kind: 'transactions',
      status: 'previewed',
      rowCount: 8,
      acceptedRows: 8,
      rejectedRows: 0,
      errors: [],
    });
    expect(res.body.data.sampleRows).toHaveLength(8);
    expect(res.body.data.importId).toBeDefined();
  });

  it('previews clean invoices CSV successfully for an employee', async () => {
    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'invoices')
      .attach('file', INV_CLEAN);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      kind: 'invoices',
      status: 'previewed',
      rowCount: 5,
      acceptedRows: 5,
      rejectedRows: 0,
    });
    expect(res.body.data.sampleRows).toHaveLength(5);
  });

  it('returns 200 with status rejected and error list for bad CSV', async () => {
    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'invoices')
      .attach('file', INV_BAD);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.errors.length).toBeGreaterThan(0);
    expect(res.body.data.sampleRows).toBeUndefined();
  });

  it('rejects oversize file (>5 MB) with 413 PayloadTooLargeError', async () => {
    const hugeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 'a');

    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', hugeBuffer, 'huge.csv');

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('enforces 5 requests per minute rate limit per tenant', async () => {
    // 4 requests were made above for tenantId, 5th request succeeds
    const fifth = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);
    expect(fifth.status).toBe(200);

    // 6th request from the same tenant gets 429
    const sixth = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects non-multipart requests with 400 ValidationError', async () => {
    const t2 = 'tenant_preview_validation';
    await seedTestMember(t2, ownerId, 'owner');

    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', t2)
      .set('Content-Type', 'application/json')
      .send({ kind: 'transactions' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('multipart/form-data');
  });

  it('rejects non-CSV file types with 400 ValidationError', async () => {
    const t2 = 'tenant_preview_validation';
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', t2)
      .field('kind', 'transactions')
      .attach('file', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('must be a CSV');
  });

  it('rejects missing file with 400 ValidationError', async () => {
    const t2 = 'tenant_preview_validation';

    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', t2)
      .field('kind', 'transactions');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing or invalid kind with 400 ValidationError', async () => {
    const t3 = 'tenant_preview_invalid_kind';
    await seedTestMember(t3, ownerId, 'owner');

    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', t3)
      .field('kind', 'crypto')
      .attach('file', TX_CLEAN);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 Forbidden for reviewer role lacking imports:write', async () => {
    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 Unauthenticated when no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/imports/preview')
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'transactions')
      .attach('file', TX_CLEAN);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
