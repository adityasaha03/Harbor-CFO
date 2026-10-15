import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { createSchema } from '../base-schema';
import { useTestDb } from '../test/mongo-test-harness';
import { withTransaction } from '../with-transaction';

interface TestAccountDoc {
  tenantId: string;
  code: string;
  balanceMinor: number;
}

interface TestLedgerEntryDoc {
  tenantId: string;
  amountMinor: number;
  description: string;
}

const accountSchema = createSchema<TestAccountDoc>({
  tenantId: { type: String, required: true },
  code: { type: String, required: true },
  balanceMinor: { type: Number, required: true },
});

const ledgerEntrySchema = createSchema<TestLedgerEntryDoc>({
  tenantId: { type: String, required: true },
  amountMinor: { type: Number, required: true },
  description: { type: String, required: true },
});

const TestAccount = mongoose.model<TestAccountDoc>('TestAccount', accountSchema);
const TestLedgerEntry = mongoose.model<TestLedgerEntryDoc>('TestLedgerEntry', ledgerEntrySchema);

describe('withTransaction atomic transaction helper', () => {
  useTestDb();

  it('commits writes across two collections when transaction succeeds', async () => {
    const result = await withTransaction(async (session) => {
      const [account] = await TestAccount.create(
        [
          {
            tenantId: 'tenant-1',
            code: 'OPERATING',
            balanceMinor: 1000000,
          },
        ],
        { session },
      );

      const [entry] = await TestLedgerEntry.create(
        [
          {
            tenantId: 'tenant-1',
            amountMinor: 500000,
            description: 'Customer deposit',
          },
        ],
        { session },
      );

      if (!account || !entry) {
        throw new Error('Failed to create account or entry');
      }

      return { accountId: account.id as string, entryId: entry.id as string };
    });

    expect(result.accountId).toBeDefined();
    expect(result.entryId).toBeDefined();

    const accountCount = await TestAccount.countDocuments({ tenantId: 'tenant-1' });
    const entryCount = await TestLedgerEntry.countDocuments({ tenantId: 'tenant-1' });

    expect(accountCount).toBe(1);
    expect(entryCount).toBe(1);
  });

  it('proves a thrown error rolls back all writes in two collections', async () => {
    const transactionAttempt = withTransaction(async (session) => {
      await TestAccount.create(
        [
          {
            tenantId: 'tenant-rollback',
            code: 'OPERATING',
            balanceMinor: 2000000,
          },
        ],
        { session },
      );

      await TestLedgerEntry.create(
        [
          {
            tenantId: 'tenant-rollback',
            amountMinor: -100000,
            description: 'Failed rent payment',
          },
        ],
        { session },
      );

      throw new Error('Simulated failure after inserting into both collections');
    });

    await expect(transactionAttempt).rejects.toThrow(
      'Simulated failure after inserting into both collections',
    );

    // Verify atomic rollback across both collections
    const accountsAfterRollback = await TestAccount.find({ tenantId: 'tenant-rollback' });
    const entriesAfterRollback = await TestLedgerEntry.find({ tenantId: 'tenant-rollback' });

    expect(accountsAfterRollback).toHaveLength(0);
    expect(entriesAfterRollback).toHaveLength(0);
  });

  it('reuses existing session when passed as second argument', async () => {
    await withTransaction(async (parentSession) => {
      await withTransaction(async (childSession) => {
        expect(childSession).toBe(parentSession);
        await TestAccount.create(
          [
            {
              tenantId: 'tenant-nested',
              code: 'SAVINGS',
              balanceMinor: 50000,
            },
          ],
          { session: childSession },
        );
      }, parentSession);
    });

    const accounts = await TestAccount.find({ tenantId: 'tenant-nested' });
    expect(accounts).toHaveLength(1);
  });
});
