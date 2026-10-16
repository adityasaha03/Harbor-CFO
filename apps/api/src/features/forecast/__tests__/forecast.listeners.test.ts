import { describe, it, expect, beforeEach } from 'vitest';
import type { EventDto } from '@harbor/contracts';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { tenantsRepository } from '../../tenants';
import { accountsRepository } from '../../accounts';
import { invoicesRepository } from '../../invoices';
import { eventsBus } from '../../events/events.bus';
import { eventsService } from '../../events/events.service';
import { ForecastRunModel } from '../forecast.model';
import { registerForecastListeners } from '../forecast.listeners';

describe('Forecast Reactive Domain Event Listener', () => {
  useTestDb();

  const tenantId = 'tenant_listener_test';

  beforeEach(async () => {
    registerForecastListeners();

    await tenantsRepository.upsertDefaults(tenantId);
    await tenantsRepository.update(tenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000,
    });
    await accountsRepository.create(tenantId, {
      code: '1001',
      name: 'Listener Cash',
      openingBalanceMinor: 5_000_000,
      openingBalanceDate: '2026-10-20',
    });
    await invoicesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'INV-LISTENER-1',
        direction: 'AR',
        counterpartyExternalId: 'CUST-1',
        totalMinor: 1_000_000,
        outstandingMinor: 1_000_000,
        dueOn: '2026-10-30',
        expectedSettlementOn: '2026-10-30',
        status: 'open',
      },
    ]);
  });

  it('recomputes baseline and emits forecast.updated on import.committed event', async () => {
    // Wait for the forecast.updated event
    const forecastUpdatedPromise = new Promise<EventDto>((resolve) => {
      const unsubscribe = eventsBus.onTenantEvent(tenantId, (event) => {
        if (event.kind === 'forecast.updated') {
          unsubscribe();
          resolve(event);
        }
      });
    });

    // Simulate an import committed event
    await eventsService.publish(tenantId, {
      kind: 'import.committed',
      publicSummary: 'Bank feed import committed (batch 1)',
      resourceRefs: ['import_batch_1'],
    });

    const receivedEvent = await forecastUpdatedPromise;
    expect(receivedEvent.kind).toBe('forecast.updated');
    expect(receivedEvent.tenantId).toBe(tenantId);
    expect(receivedEvent.resourceRefs).toHaveLength(1);

    const forecastId = receivedEvent.resourceRefs[0];
    const savedRun = await ForecastRunModel.findById(forecastId);
    expect(savedRun).not.toBeNull();
    expect(savedRun!.tenantId).toBe(tenantId);
    expect(savedRun!.scenarioHash).toBe('base');
  });

  it('recomputes baseline on action.committed event', async () => {
    const actionUpdatedPromise = new Promise<EventDto>((resolve) => {
      const unsubscribe = eventsBus.onTenantEvent(tenantId, (event) => {
        if (event.kind === 'forecast.updated') {
          unsubscribe();
          resolve(event);
        }
      });
    });

    await eventsService.publish(tenantId, {
      kind: 'action.committed',
      publicSummary: 'Early payment discount executed',
      resourceRefs: ['action_dis_1'],
    });

    const receivedEvent = await actionUpdatedPromise;
    expect(receivedEvent.kind).toBe('forecast.updated');
  });
});
