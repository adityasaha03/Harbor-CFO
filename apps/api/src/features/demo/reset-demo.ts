import { DEMO_TENANTS } from '@harbor/contracts';
import { connectMongo, disconnectMongo } from '../../core/db/mongo';
import { logger } from '../../core/logging/logger';
import { demoService } from './demo.service';

export async function resetDemoTenant(slug: string = DEMO_TENANTS.HARBOR_WHOLESALE): Promise<void> {
  logger.info({ slug }, 'Resetting demo tenant...');
  const res = await demoService.seedTenant(slug);
  logger.info({ tenantId: res.tenantId, slug }, 'Demo tenant reset completed');
}

async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('features/demo/reset-demo.ts');

  if (!isDirectRun) {
    return;
  }

  await connectMongo();
  try {
    const targetSlug = process.argv[2] || DEMO_TENANTS.HARBOR_WHOLESALE;
    await resetDemoTenant(targetSlug);
  } finally {
    await disconnectMongo();
  }
}

void runCli().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error during demo reset');
  process.exit(1);
});
