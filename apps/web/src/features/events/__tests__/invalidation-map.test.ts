import { describe, it, expect } from 'vitest';
import { getQueryKeysForEvent } from '../lib/invalidation-map';
import { queryKeys } from '@/lib/query/keys';

describe('invalidation-map', () => {
  it('maps import.committed to forecast, analytics, alerts, imports, and ledger query keys', () => {
    const keys = getQueryKeysForEvent('import.committed');
    expect(keys).toContainEqual(queryKeys.forecast.all);
    expect(keys).toContainEqual(queryKeys.analytics.all);
    expect(keys).toContainEqual(queryKeys.alerts.all);
    expect(keys).toContainEqual(queryKeys.imports.all);
    expect(keys).toContainEqual(queryKeys.ledger.all);
  });

  it('maps forecast.updated to forecast and alerts query keys', () => {
    const keys = getQueryKeysForEvent('forecast.updated');
    expect(keys).toContainEqual(queryKeys.forecast.all);
    expect(keys).toContainEqual(queryKeys.alerts.all);
  });

  it('maps alert.raised and alert.resolved to alerts query key', () => {
    expect(getQueryKeysForEvent('alert.raised')).toContainEqual(queryKeys.alerts.all);
    expect(getQueryKeysForEvent('alert.resolved')).toContainEqual(queryKeys.alerts.all);
  });

  it('maps action.committed to forecast, proposals, ledger, and analytics query keys', () => {
    const keys = getQueryKeysForEvent('action.committed');
    expect(keys).toContainEqual(queryKeys.forecast.all);
    expect(keys).toContainEqual(queryKeys.proposals.all);
    expect(keys).toContainEqual(queryKeys.ledger.all);
    expect(keys).toContainEqual(queryKeys.analytics.all);
  });

  it('maps tool and run lifecycle events to agent query key', () => {
    expect(getQueryKeysForEvent('tool.started')).toContainEqual(queryKeys.agent.all);
    expect(getQueryKeysForEvent('tool.completed')).toContainEqual(queryKeys.agent.all);
    expect(getQueryKeysForEvent('run.completed')).toContainEqual(queryKeys.agent.all);
    expect(getQueryKeysForEvent('run.failed')).toContainEqual(queryKeys.agent.all);
  });
});
