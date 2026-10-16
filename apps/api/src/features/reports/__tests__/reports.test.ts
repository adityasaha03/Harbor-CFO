import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from '../../../test-utils/test-auth-helper';
import { tenantsRepository } from '../../tenants';
import { accountsRepository } from '../../accounts';
import { LedgerEntryModel } from '../../ledger/ledger.model';

describe('B19 Reports Export (CSV with Formula Escaping & PDF)', () => {
  useTestDb();
  const app = createApp();

  const tenantA = 'tenant_reports_a';
  const tenantB = 'tenant_reports_b';
  const userA = 'usr_reports_a';
  let tokenA: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantA, userA, 'owner');
    tokenA = await issueTestToken(userA);

    await tenantsRepository.upsertDefaults(tenantA);
    await tenantsRepository.update(tenantA, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000,
    });

    await accountsRepository.create(tenantA, {
      code: 'OPERATING',
      name: 'Primary Operating Cash',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-01',
    });

    // Seed Ledger Entries including formula injection attack strings
    await LedgerEntryModel.create([
      {
        tenantId: tenantA,
        accountCode: 'OPERATING',
        externalId: 'TX-LEGIT-1',
        bookedOn: '2026-10-05',
        amountMinor: 2_000_000,
        currency: 'CNY',
        category: 'customer_receipt',
        description: 'Customer regular payment',
        kind: 'imported',
      },
      {
        tenantId: tenantA,
        accountCode: 'OPERATING',
        externalId: '=CMD|/C CALC', // Dangerous formula in ID
        bookedOn: '2026-10-12',
        amountMinor: -1_500_000,
        currency: 'CNY',
        category: 'supplier_payment',
        description: '+SUM(A1:A100) and -2+3', // Dangerous formula in Description
        kind: 'imported',
      },
      {
        tenantId: tenantA,
        accountCode: 'OPERATING',
        externalId: '@EVIL_FORMULA', // Dangerous @ formula
        bookedOn: '2026-10-15',
        amountMinor: -500_000,
        currency: 'CNY',
        category: 'overhead',
        description: '=1+1',
        kind: 'imported',
      },
      // Tenant B entry (must NOT leak into Tenant A's report)
      {
        tenantId: tenantB,
        accountCode: 'OPERATING',
        externalId: 'TX-TENANT-B-SECRET',
        bookedOn: '2026-10-10',
        amountMinor: 99_999_900,
        currency: 'CNY',
        category: 'other_income',
        description: 'Top secret proprietary deal for Tenant B',
        kind: 'imported',
      },
    ]);
  });

  it('GET /api/v1/reports/cash-summary?format=csv returns formula-escaped CSV', async () => {
    const res = await request(app)
      .get('/api/v1/reports/cash-summary?month=2026-10&format=csv')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('cash-summary-2026-10.csv');

    const csv = res.text;

    // Check header totals
    expect(csv).toContain('"Opening Cash Balance",80000.00,8000000');
    expect(csv).toContain('"Total Inflows (Receipts)",20000.00,2000000');
    expect(csv).toContain('"Total Outflows (Payments)",20000.00,2000000');
    expect(csv).toContain('"Closing Cash Balance",80000.00,8000000');

    // FORMULA ESCAPING ASSERTIONS:
    // Any cell starting with =, +, -, @ must be prefixed with a single quote '
    expect(csv).toContain("\"'=CMD|/C CALC\"");
    expect(csv).toContain("\"'+SUM(A1:A100)");
    expect(csv).toContain("\"'@EVIL_FORMULA\"");
    expect(csv).toContain("\"'=1+1\"");

    // Raw unescaped dangerous formulas must NOT be present as starting cell characters
    expect(csv).not.toMatch(/"=CMD/);
    expect(csv).not.toMatch(/">\+SUM/);
    expect(csv).not.toMatch(/"@EVIL/);

    // Tenant isolation: Tenant B's entry is not in the CSV
    expect(csv).not.toContain('TX-TENANT-B-SECRET');
    expect(csv).not.toContain('Top secret proprietary deal');
  });

  it('GET /api/v1/reports/cash-summary?format=pdf returns valid standard PDF bytes', async () => {
    const res = await request(app)
      .get('/api/v1/reports/cash-summary?month=2026-10&format=pdf')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('cash-summary-2026-10.pdf');

    const pdfBuffer = Buffer.from(res.body);
    const pdfText = pdfBuffer.toString('utf-8');

    // PDF Standard Header & Trailer checks
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('/Type /Catalog');
    expect(pdfText).toContain('/Type /Pages');
    expect(pdfText).toContain('HarborCFO — Monthly Cash Summary Report');
    expect(pdfText).toContain('%%EOF');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .get('/api/v1/reports/cash-summary?month=2026-10')
      .set('X-Tenant-Id', tenantA);

    expect(res.status).toBe(401);
  });
});
