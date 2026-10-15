import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { createSchema } from '../base-schema';
import { syncAllIndexes } from '../sync-indexes';
import { useTestDb } from '../test/mongo-test-harness';

interface TestIndexedDoc {
  tenantId: string;
  email: string;
  code: string;
}

const indexedSchema = createSchema<TestIndexedDoc>({
  tenantId: { type: String, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
});

indexedSchema.index({ tenantId: 1, email: 1 }, { unique: true });
indexedSchema.index({ code: 1 });

const TestIndexedModel = mongoose.model<TestIndexedDoc>('TestIndexedModel', indexedSchema);

describe('syncAllIndexes utility', () => {
  useTestDb();

  it('synchronizes registered model indexes without error', async () => {
    const results = await syncAllIndexes([TestIndexedModel as mongoose.Model<unknown>]);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      modelName: 'TestIndexedModel',
      success: true,
    });

    const indexes = await TestIndexedModel.collection.indexes();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('tenantId_1_email_1');
    expect(indexNames).toContain('code_1');
  });
});
