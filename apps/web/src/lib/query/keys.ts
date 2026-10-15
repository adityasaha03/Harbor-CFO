/**
 * Central query key factory for TanStack Query across all features.
 * Used for consistent caching and selective cache invalidations.
 */
export const queryKeys = {
  me: ['me'] as const,

  forecast: {
    all: ['forecast'] as const,
    latest: () => [...queryKeys.forecast.all, 'latest'] as const,
    detail: (id: string) => [...queryKeys.forecast.all, 'detail', id] as const,
    day: (date: string) => [...queryKeys.forecast.all, 'day', date] as const,
  },

  alerts: {
    all: ['alerts'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.alerts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.alerts.all, 'detail', id] as const,
  },

  imports: {
    all: ['imports'] as const,
    list: () => [...queryKeys.imports.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.imports.all, 'detail', id] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    summary: () => [...queryKeys.analytics.all, 'summary'] as const,
    healthScore: () => [...queryKeys.analytics.all, 'health-score'] as const,
  },

  financing: {
    all: ['financing'] as const,
    offers: () => [...queryKeys.financing.all, 'offers'] as const,
  },

  scenarios: {
    all: ['scenarios'] as const,
    list: () => [...queryKeys.scenarios.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.scenarios.all, 'detail', id] as const,
  },

  proposals: {
    all: ['proposals'] as const,
    list: () => [...queryKeys.proposals.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.proposals.all, 'detail', id] as const,
  },

  agent: {
    all: ['agent'] as const,
    runs: () => [...queryKeys.agent.all, 'runs'] as const,
    run: (id: string) => [...queryKeys.agent.all, 'run', id] as const,
  },

  ledger: {
    all: ['ledger'] as const,
    entries: (filters?: Record<string, unknown>) =>
      [...queryKeys.ledger.all, 'entries', filters] as const,
  },

  invoices: {
    all: ['invoices'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.all, 'list', filters] as const,
  },

  settings: {
    all: ['settings'] as const,
    tenant: () => [...queryKeys.settings.all, 'tenant'] as const,
  },
} as const;
