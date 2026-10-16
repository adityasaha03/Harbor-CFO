import type { ClientSession } from 'mongoose';
import {
  type ForecastInput,
  type ForecastRunDto,
  type LatestForecastResponse,
  type ForecastDayDrilldownResponse,
  type ForecastSummaryWithConservative,
} from '@harbor/contracts';
import { NotFoundError } from '../../core/http/app-error';
import { tenantsRepository } from '../tenants';
import { invoicesRepository } from '../invoices';
import { commitmentsRepository } from '../commitments';
import {
  runForecast,
  summarize,
  conservative,
  toWeekly,
} from './engine';
import {
  FORECAST_ALGORITHM_VERSION,
  BASELINE_SCENARIO_HASH,
  DEFAULT_CONSERVATIVE_EXTRA_DAYS,
  BASELINE_ASSUMPTIONS,
} from './forecast.constants';
import { loadForecastInput } from './forecast.inputs';
import { forecastRepository } from './forecast.repository';

export const forecastService = {
  /**
   * Retrieves or computes the cached baseline forecast run for a tenant.
   */
  async getBaseline(
    tenantId: string,
    session?: ClientSession,
  ): Promise<LatestForecastResponse> {
    const { input, datasetVersion } = await loadForecastInput(tenantId, session);

    // 1. Check cached run for current dataset version
    const cached = await forecastRepository.findByCacheKey(
      tenantId,
      datasetVersion,
      FORECAST_ALGORITHM_VERSION,
      BASELINE_SCENARIO_HASH,
      session,
    );

    if (cached) {
      const weeklyBuckets = toWeekly(cached.points);
      return {
        run: cached,
        weeklyBuckets,
        asOfDate: cached.asOfDate,
        horizonDays: cached.horizonDays,
        assumptions: BASELINE_ASSUMPTIONS,
        inputVersion: cached.inputVersion,
        isStale: cached.inputVersion < datasetVersion,
      };
    }

    // 2. Compute baseline forecast
    const points = runForecast(input);
    const baseSummary = summarize(points, input.floorMinor);

    // 3. Compute conservative variant
    const conservativeInput = conservative(input, DEFAULT_CONSERVATIVE_EXTRA_DAYS);
    const conservativePoints = runForecast(conservativeInput);
    const conservativeSummary = summarize(conservativePoints, input.floorMinor);

    const summary: ForecastSummaryWithConservative = {
      ...baseSummary,
      conservativeMinCashMinor: conservativeSummary.minCashMinor,
    };

    // 4. Upsert into repository cache
    const run = await forecastRepository.upsertRun(
      tenantId,
      {
        inputVersion: datasetVersion,
        algorithmVersion: FORECAST_ALGORITHM_VERSION,
        scenarioHash: BASELINE_SCENARIO_HASH,
        asOfDate: input.asOfDate,
        horizonDays: input.horizonDays,
        floorMinor: input.floorMinor,
        openingCashMinor: input.openingCashMinor,
        points,
        summary,
      },
      session,
    );

    const weeklyBuckets = toWeekly(points);

    return {
      run,
      weeklyBuckets,
      asOfDate: run.asOfDate,
      horizonDays: run.horizonDays,
      assumptions: BASELINE_ASSUMPTIONS,
      inputVersion: run.inputVersion,
      isStale: false,
    };
  },

  /**
   * Computes and persists a forecast run for a custom scenario input.
   */
  async computeForInput(
    tenantId: string,
    input: ForecastInput,
    scenarioHash: string,
    scenarioId?: string,
    session?: ClientSession,
  ): Promise<ForecastRunDto> {
    const settings = await tenantsRepository.findByTenantId(tenantId, session);
    const inputVersion = settings?.datasetVersion ?? 1;

    const points = runForecast(input);
    const baseSummary = summarize(points, input.floorMinor);

    const conservativeInput = conservative(input, DEFAULT_CONSERVATIVE_EXTRA_DAYS);
    const conservativePoints = runForecast(conservativeInput);
    const conservativeSummary = summarize(conservativePoints, input.floorMinor);

    const summary: ForecastSummaryWithConservative = {
      ...baseSummary,
      conservativeMinCashMinor: conservativeSummary.minCashMinor,
    };

    return forecastRepository.upsertRun(
      tenantId,
      {
        inputVersion,
        algorithmVersion: FORECAST_ALGORITHM_VERSION,
        scenarioHash,
        scenarioId,
        asOfDate: input.asOfDate,
        horizonDays: input.horizonDays,
        floorMinor: input.floorMinor,
        openingCashMinor: input.openingCashMinor,
        points,
        summary,
      },
      session,
    );
  },

  /**
   * Retrieves a specific forecast run by ID (strictly tenant-scoped).
   */
  async getById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ForecastRunDto> {
    const run = await forecastRepository.findById(tenantId, id, session);
    if (!run) {
      throw new NotFoundError('Forecast run not found');
    }
    return run;
  },

  /**
   * Retrieves single-day provenance drilldown for the baseline forecast.
   */
  async getDayDrilldown(
    tenantId: string,
    date: string,
    session?: ClientSession,
  ): Promise<ForecastDayDrilldownResponse> {
    const { run } = await forecastService.getBaseline(tenantId, session);

    const point = run.points.find((p) => p.date === date);
    if (!point) {
      throw new NotFoundError(`No forecast point found for date ${date}`);
    }

    // Identify underlying invoices and commitments matching the flow sources
    const invoiceIds = point.sources
      .filter((s) => s.type === 'invoice')
      .map((s) => s.id);
    const commitmentIds = point.sources
      .filter((s) => s.type === 'commitment')
      .map((s) => s.id);

    const [allInvoices, allCommitments] = await Promise.all([
      invoiceIds.length > 0 ? invoicesRepository.list(tenantId, undefined, session) : [],
      commitmentIds.length > 0 ? commitmentsRepository.list(tenantId, session) : [],
    ]);

    const matchingInvoices = allInvoices.filter((inv) => invoiceIds.includes(inv.externalId));
    const matchingCommitments = allCommitments.filter((c) =>
      commitmentIds.includes(String(c.id ?? (c as { _id?: unknown })._id)),
    );

    return {
      date: point.date,
      closingMinor: point.closingMinor,
      receiptsMinor: point.receiptsMinor,
      paymentsMinor: point.paymentsMinor,
      financingMinor: point.financingMinor,
      feesMinor: point.feesMinor,
      repaymentsMinor: point.repaymentsMinor,
      sources: point.sources,
      invoices: matchingInvoices as unknown as Record<string, unknown>[],
      commitments: matchingCommitments as unknown as Record<string, unknown>[],
    };
  },
};
