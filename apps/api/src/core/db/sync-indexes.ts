import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from './mongo';
import { logger } from '../logging/logger';

export interface SyncIndexesResult {
  modelName: string;
  success: boolean;
  error?: string;
}

/**
 * Synchronize indexes for all currently registered Mongoose models,
 * or for an explicitly provided array of models.
 */
export async function syncAllIndexes(
  models?: mongoose.Model<unknown>[],
): Promise<SyncIndexesResult[]> {
  const targetModels = models ?? Object.values(mongoose.models);
  const results: SyncIndexesResult[] = [];

  for (const model of targetModels) {
    try {
      await model.syncIndexes();
      logger.info({ model: model.modelName }, 'Synchronized indexes successfully');
      results.push({ modelName: model.modelName, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ model: model.modelName, err }, 'Failed to sync indexes for model');
      results.push({ modelName: model.modelName, success: false, error: message });
    }
  }

  return results;
}

/**
 * CLI execution entrypoint for `pnpm db:sync-indexes`.
 */
async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('core/db/sync-indexes.ts');

  if (!isDirectRun) {
    return;
  }

  logger.info('Starting database index synchronization...');
  await connectMongo();
  try {
    const results = await syncAllIndexes();
    const hasErrors = results.some((r) => !r.success);
    if (hasErrors) {
      logger.error({ results }, 'Index synchronization finished with errors');
      process.exit(1);
    }
    logger.info({ modelCount: results.length }, 'Index synchronization finished successfully');
  } finally {
    await disconnectMongo();
  }
}

void runCli().catch((err: unknown) => {
  logger.fatal({ err }, 'Unhandled error during db:sync-indexes execution');
  process.exit(1);
});
