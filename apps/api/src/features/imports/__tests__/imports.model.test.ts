import { describe, it, expect } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { ImportModel } from '../imports.model.js';

describe('ImportModel indexes and constraints', () => {
  useTestDb();

  it('enforces partial unique index on committed imports with same checksum', async () => {
    await ImportModel.init();

    // 1. Creating two previewed imports with the same checksum is allowed
    await ImportModel.create({
      tenantId: 'tenant_model_test',
      kind: 'transactions',
      fileName: 'tx.csv',
      checksum: 'sha256-duplicate-checksum-1',
      mappingVersion: 1,
      status: 'previewed',
      rowCount: 10,
      acceptedRows: 10,
      rejectedRows: 0,
      errors: [],
      actorId: 'usr_1',
      expiresAt: new Date(Date.now() + 86400000),
    });

    await ImportModel.create({
      tenantId: 'tenant_model_test',
      kind: 'transactions',
      fileName: 'tx2.csv',
      checksum: 'sha256-duplicate-checksum-1',
      mappingVersion: 1,
      status: 'previewed',
      rowCount: 10,
      acceptedRows: 10,
      rejectedRows: 0,
      errors: [],
      actorId: 'usr_1',
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. First committed import succeeds
    await ImportModel.create({
      tenantId: 'tenant_model_test',
      kind: 'transactions',
      fileName: 'tx_committed.csv',
      checksum: 'sha256-duplicate-checksum-1',
      mappingVersion: 1,
      status: 'committed',
      rowCount: 10,
      acceptedRows: 10,
      rejectedRows: 0,
      errors: [],
      actorId: 'usr_1',
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 3. Second committed import with identical (tenantId, kind, checksum, mappingVersion) fails
    await expect(
      ImportModel.create({
        tenantId: 'tenant_model_test',
        kind: 'transactions',
        fileName: 'tx_committed_dup.csv',
        checksum: 'sha256-duplicate-checksum-1',
        mappingVersion: 1,
        status: 'committed',
        rowCount: 10,
        acceptedRows: 10,
        rejectedRows: 0,
        errors: [],
        actorId: 'usr_1',
        expiresAt: new Date(Date.now() + 86400000),
      }),
    ).rejects.toThrow();
  });

  it('has TTL index on expiresAt and history index on (tenantId, createdAt)', async () => {
    await ImportModel.init();
    const indexes = await ImportModel.collection.indexes();

    const ttlIndex = indexes.find(
      (idx) => idx.key.expiresAt === 1 && idx.expireAfterSeconds === 0,
    );
    expect(ttlIndex).toBeDefined();

    const historyIndex = indexes.find(
      (idx) => idx.key.tenantId === 1 && idx.key.createdAt === -1,
    );
    expect(historyIndex).toBeDefined();
  });
});
