import { queryKeys } from '@/lib/query/keys';
import type { EventKind } from '@harbor/contracts';

/**
 * Maps incoming domain event kinds to query key prefixes that must be invalidated in TanStack Query.
 */
export const EVENT_QUERY_INVALIDATION_MAP: Record<EventKind, readonly (readonly unknown[])[]> = {
  'import.committed': [
    queryKeys.forecast.all,
    queryKeys.analytics.all,
    queryKeys.alerts.all,
    queryKeys.imports.all,
    queryKeys.ledger.all,
  ],
  'forecast.updated': [
    queryKeys.forecast.all,
    queryKeys.alerts.all,
  ],
  'alert.raised': [
    queryKeys.alerts.all,
  ],
  'alert.resolved': [
    queryKeys.alerts.all,
  ],
  'action.committed': [
    queryKeys.forecast.all,
    queryKeys.proposals.all,
    queryKeys.ledger.all,
    queryKeys.analytics.all,
  ],
  'proposal.created': [
    queryKeys.proposals.all,
  ],
  'approval.required': [
    queryKeys.proposals.all,
  ],
  'tool.started': [
    queryKeys.agent.all,
  ],
  'tool.completed': [
    queryKeys.agent.all,
  ],
  'run.completed': [
    queryKeys.agent.all,
  ],
  'run.failed': [
    queryKeys.agent.all,
  ],
};

export function getQueryKeysForEvent(eventKind: EventKind): readonly (readonly unknown[])[] {
  return EVENT_QUERY_INVALIDATION_MAP[eventKind] || [];
}
