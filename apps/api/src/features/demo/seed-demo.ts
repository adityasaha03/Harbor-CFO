import { DEMO_TENANTS } from '@harbor/contracts';
import { connectMongo, disconnectMongo } from '../../core/db/mongo';
import { logger } from '../../core/logging/logger';
import { demoService } from './demo.service';

export async function seedAllDemoTenants(): Promise<void> {
  logger.info('Starting Harbor Wholesale demo seed...');
  const harbor = await demoService.seedTenant(DEMO_TENANTS.HARBOR_WHOLESALE);
  logger.info({ tenantId: harbor.tenantId }, 'Harbor Wholesale demo seeded successfully');

  logger.info('Starting Pearl Bakery demo seed...');
  const pearl = await demoService.seedTenant(DEMO_TENANTS.PEARL_BAKERY);
  logger.info({ tenantId: pearl.tenantId }, 'Pearl Bakery demo seeded successfully');
}

async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('features/demo/seed-demo.ts');

  if (!isDirectRun) {
    return;
  }

  await connectMongo();
  try {
    await seedAllDemoTenants();
    logger.info('Demo seeding completed successfully');
  } finally {
    await disconnectMongo();
  }
}

void runCli().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error during demo seeding');
  process.exit(1);
});
