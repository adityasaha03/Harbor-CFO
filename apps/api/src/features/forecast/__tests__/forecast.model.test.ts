import { describe, it, expect } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { ForecastRunModel } from '../forecast.model';
import { forecastRepository } from '../forecast.repository';

describe('ForecastRunModel and Repository', () => {
  useTestDb();

  const sampleRunData = {
    inputVersion: 1,
    algorithmVersion: 'fc-1',
    scenarioHash: 'base',
    asOfDate: '2026-10-20',
    horizonDays: 91,
    floorMinor: 3_000_000,
    openingCashMinor: 8_000_000,
    points: [
      {
        date: '2026-10-20',
        closingMinor: 8_000_000,
        receiptsMinor: 0,
        paymentsMinor: 0,
        financingMinor: 0,
        feesMinor: 0,
        repaymentsMinor: 0,
        sources: [],
      },
    ],
    summary: {
      minCashMinor: 8_000_000,
      minCashDate: '2026-10-20',
      firstBelowFloorDate: null,
      firstNegativeDate: null,
      liquidityGapMinor: 0,
      conservativeMinCashMinor: 8_000_000,
    },
  };

  it('enforces unique compound index on (tenantId, inputVersion, algorithmVersion, scenarioHash)', async () => {
    await ForecastRunModel.init();

    await ForecastRunModel.create({
      tenantId: 'tenant_model_test',
      ...sampleRunData,
    });

    // Duplicate create with exact same compound key should throw duplicate key error
    await expect(
      ForecastRunModel.create({
        tenantId: 'tenant_model_test',
        ...sampleRunData,
      }),
    ).rejects.toThrow();

    // Different scenarioHash succeeds
    const customScenario = await ForecastRunModel.create({
      tenantId: 'tenant_model_test',
      ...sampleRunData,
      scenarioHash: 'scenario_custom_1',
    });
    expect(customScenario._id).toBeDefined();

    // Different inputVersion succeeds
    const nextVersion = await ForecastRunModel.create({
      tenantId: 'tenant_model_test',
      ...sampleRunData,
      inputVersion: 2,
    });
    expect(nextVersion._id).toBeDefined();

    // Different tenantId succeeds
    const anotherTenant = await ForecastRunModel.create({
      tenantId: 'tenant_model_other',
      ...sampleRunData,
    });
    expect(anotherTenant._id).toBeDefined();
  });

  it('upsertRun creates new run and updates existing without duplicate key errors', async () => {
    const tenantId = 'tenant_upsert_test';

    const created = await forecastRepository.upsertRun(tenantId, sampleRunData);
    expect(created.id).toBeDefined();
    expect(created.floorMinor).toBe(3_000_000);

    const updated = await forecastRepository.upsertRun(tenantId, {
      ...sampleRunData,
      floorMinor: 4_000_000,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.floorMinor).toBe(4_000_000);

    const fetched = await forecastRepository.findByCacheKey(
      tenantId,
      1,
      'fc-1',
      'base',
    );
    expect(fetched).not.toBeNull();
    expect(fetched!.floorMinor).toBe(4_000_000);
  });
});
