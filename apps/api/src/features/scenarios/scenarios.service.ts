import type { ClientSession } from 'mongoose';
import type { CreateScenarioInput, CreateScenarioResponse, ScenarioDto, ScenarioChange } from '@harbor/contracts';
import { NotFoundError, ValidationError } from '../../core/http/app-error';
import type { ActorContext } from '../auth/auth.types';
import { tenantsRepository } from '../tenants';
import { invoicesRepository } from '../invoices';
import { forecastService, loadForecastInput } from '../forecast';
import { financingRepository } from '../financing/financing.repository';
import { applyChanges, compare, computeScenarioHash } from './engine';
import { scenariosRepository } from './scenarios.repository';
import { validateScenarioChanges } from './scenarios.validation';
import { SCENARIO_EXPIRY_HOURS, SCENARIOS_DEFAULT_LIMIT } from './scenarios.constants';

export const scenariosService = {
  /**
   * Creates, simulates, compares, and persists a what-if scenario.
   */
  async createScenario(
    actor: ActorContext,
    input: CreateScenarioInput,
    session?: ClientSession,
  ): Promise<CreateScenarioResponse> {
    const tenantId = actor.tenantId;

    // 1. Gather baseline and input context
    const [baseline, loadedData, catalog] = await Promise.all([
      forecastService.getBaseline(tenantId, session),
      loadForecastInput(tenantId, session),
      financingRepository.listCatalog(session),
    ]);

    const { input: baseInput, datasetVersion, tenantSettings } = loadedData;

    // 2. Validate all changes against live data and eligibility rules
    await validateScenarioChanges(
      tenantId,
      input.changes,
      baseInput,
      baseline.run,
      tenantSettings,
      session,
    );

    // 3. Build pure modified forecast input
    const modifiedInput = applyChanges(baseInput, input.changes, catalog);

    // 4. Compute deterministic scenario hash
    const scenarioHash = computeScenarioHash(input.changes, datasetVersion);

    // 5. Compute scenario forecast run
    const scenarioRun = await forecastService.computeForInput(
      tenantId,
      modifiedInput,
      scenarioHash,
      undefined,
      session,
    );

    // 6. Compare baseline vs. scenario
    const comparison = compare(baseline.run, scenarioRun, input.changes, catalog);

    // 7. Persist scenario document (+24h TTL)
    const expiresAt = new Date(Date.now() + SCENARIO_EXPIRY_HOURS * 60 * 60 * 1000);
    const scenario = await scenariosRepository.create(
      tenantId,
      {
        name: input.name,
        baseInputVersion: datasetVersion,
        changes: input.changes,
        scenarioHash,
        forecastRunId: scenarioRun.id,
        comparison,
        createdBy: actor.userId,
        expiresAt,
      },
      session,
    );

    return {
      ...comparison,
      scenario,
      scenarioId: scenario.id,
      isStale: false,
    };
  },

  /**
   * Retrieves a scenario by ID and evaluates staleness dynamically against current datasetVersion.
   */
  async getById(tenantId: string, id: string, session?: ClientSession): Promise<ScenarioDto> {
    const settings = await tenantsRepository.findByTenantId(tenantId, session);
    const currentDatasetVersion = settings?.datasetVersion ?? 1;

    const scenario = await scenariosRepository.findById(
      tenantId,
      id,
      currentDatasetVersion,
      session,
    );
    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }

    return scenario;
  },

  /**
   * Lists recent scenarios for a tenant with dynamic staleness evaluation.
   */
  async list(
    tenantId: string,
    limit = SCENARIOS_DEFAULT_LIMIT,
    session?: ClientSession,
  ): Promise<ScenarioDto[]> {
    const settings = await tenantsRepository.findByTenantId(tenantId, session);
    const currentDatasetVersion = settings?.datasetVersion ?? 1;

    return scenariosRepository.listRecent(tenantId, limit, currentDatasetVersion, session);
  },

  /**
   * Helper that creates the "largest customer pays 14 days late" scenario
   * using delay_customer_receipts.
   */
  async createStressPreset(
    actor: ActorContext,
    days = 14,
    session?: ClientSession,
  ): Promise<CreateScenarioResponse> {
    const tenantId = actor.tenantId;

    const outstanding = await invoicesRepository.listOutstanding(tenantId, session);
    const arInvoices = outstanding.filter((inv) => inv.direction === 'AR');

    if (arInvoices.length === 0) {
      throw new ValidationError('No outstanding customer receivables found for stress testing');
    }

    // Group outstanding AR by counterpartyExternalId to find largest debtor
    const customerTotals = new Map<string, number>();
    for (const inv of arInvoices) {
      const prev = customerTotals.get(inv.counterpartyExternalId) ?? 0;
      customerTotals.set(inv.counterpartyExternalId, prev + inv.outstandingMinor);
    }

    let topCustomerExternalId = '';
    let maxAr = -1;
    for (const [cId, total] of customerTotals.entries()) {
      if (total > maxAr) {
        maxAr = total;
        topCustomerExternalId = cId;
      }
    }

    const changes: ScenarioChange[] = [
      {
        type: 'delay_customer_receipts',
        counterpartyExternalId: topCustomerExternalId,
        days,
      },
    ];

    return this.createScenario(
      actor,
      {
        name: `Stress Test: Largest Customer Pays ${days} Days Late`,
        changes,
      },
      session,
    );
  },
};
