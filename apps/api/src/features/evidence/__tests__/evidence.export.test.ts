import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { DEMO_TENANTS, evidenceBundleSchema } from '@harbor/contracts';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper';
import { demoService } from '../../demo/demo.service';
import { evidenceService } from '../evidence.service';
import { runEvidenceExport } from '../export-evidence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_OUTPUT_DIR = path.resolve(__dirname, '../../../../test-output/evidence');

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('B17 Evidence Export Feature & Integrity', () => {
  useTestDb();
  const app = createApp();

  const harborOrgId = new mongoose.Types.ObjectId();
  const ownerId = 'usr_evidence_owner';
  const employeeId = 'usr_evidence_employee';

  beforeAll(async () => {
    await setupTestAuth();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(path.dirname(TEST_OUTPUT_DIR), { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const db = mongoose.connection;

    await db.collection('organization').updateOne(
      { slug: DEMO_TENANTS.HARBOR_WHOLESALE },
      { $set: { _id: harborOrgId, slug: DEMO_TENANTS.HARBOR_WHOLESALE, name: 'Harbor Wholesale' } },
      { upsert: true }
    );

    await seedTestMember(harborOrgId.toString(), ownerId, 'owner');
    await seedTestMember(harborOrgId.toString(), employeeId, 'employee');

    await demoService.seedTenant(DEMO_TENANTS.HARBOR_WHOLESALE);
  });

  it('1. GET /api/v1/evidence/export rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .get('/api/v1/evidence/export')
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(401);
  });

  it('2. GET /api/v1/evidence/export rejects employee with 403 (requires audit:export)', async () => {
    const token = await issueTestToken(employeeId);
    const res = await request(app)
      .get('/api/v1/evidence/export')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(403);
  });

  it('3. GET /api/v1/evidence/export returns complete valid bundle to Owner', async () => {
    const token = await issueTestToken(ownerId);
    const res = await request(app)
      .get('/api/v1/evidence/export')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(200);
    const parse = evidenceBundleSchema.safeParse(res.body.data);
    expect(parse.success).toBe(true);

    const bundle = res.body.data;
    expect(bundle.operations.length).toBeGreaterThan(0);
    expect(bundle.permissionTests.length).toBeGreaterThan(0);
    expect(bundle.evidenceSummary).toContain('HarborCFO Simulated Execution Evidence Summary');
    expect(Object.keys(bundle.manifest)).toHaveLength(8);
  });

  it('4. exportEvidenceToFiles exports all required files and manifest SHA256 checksums verify', async () => {
    const result = await evidenceService.exportEvidenceToFiles(harborOrgId.toString(), TEST_OUTPUT_DIR);

    const expectedFiles = [
      'run-metadata.json',
      'operations.jsonl',
      'agent-tools.jsonl',
      'permission-tests.json',
      'forecasts-before.json',
      'forecasts-after.json',
      'import-report.json',
      'evidence-summary.md',
      'manifest.json',
    ];

    for (const file of expectedFiles) {
      expect(result.files).toContain(file);
      const filePath = path.join(TEST_OUTPUT_DIR, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }

    // Verify manifest checksums match files on disk
    const manifestContent = JSON.parse(
      fs.readFileSync(path.join(TEST_OUTPUT_DIR, 'manifest.json'), 'utf-8')
    ) as Record<string, string>;

    for (const [filename, hash] of Object.entries(manifestContent)) {
      const fileBytes = fs.readFileSync(path.join(TEST_OUTPUT_DIR, filename), 'utf-8');
      expect(sha256(fileBytes)).toBe(hash);
    }
  });

  it('5. runEvidenceExport completes full story and produces verified bundle', async () => {
    const pearlOrgId = new mongoose.Types.ObjectId();
    const db = mongoose.connection;
    await db.collection('organization').updateOne(
      { slug: DEMO_TENANTS.PEARL_BAKERY },
      { $set: { _id: pearlOrgId, slug: DEMO_TENANTS.PEARL_BAKERY, name: 'Pearl Bakery' } },
      { upsert: true }
    );
    await seedTestMember(pearlOrgId.toString(), 'usr_pearl_owner', 'owner');

    const result = await runEvidenceExport();
    expect(result.files.length).toBeGreaterThanOrEqual(9);
    expect(result.manifest['manifest.json']).toBeUndefined(); // manifest only indexes output files
    expect(Object.keys(result.manifest)).toHaveLength(8);
  });
});
