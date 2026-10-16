import type { ForecastFinancing } from '@harbor/contracts';

export type ForecastContributorFn = (
  tenantId: string,
  asOfDate: string,
) => Promise<ForecastFinancing[]>;

const contributors: ForecastContributorFn[] = [];

/**
 * Register an external contributor providing future financing obligations
 * (e.g., active financingCommitments schedules registered by B14).
 * Returns an unsubscribe callback.
 */
export function registerForecastContributor(fn: ForecastContributorFn): () => void {
  contributors.push(fn);
  return () => {
    const idx = contributors.indexOf(fn);
    if (idx !== -1) {
      contributors.splice(idx, 1);
    }
  };
}

/**
 * Invokes all registered contributors and aggregates their financing flows.
 */
export async function getContributedFinancing(
  tenantId: string,
  asOfDate: string,
): Promise<ForecastFinancing[]> {
  if (contributors.length === 0) {
    return [];
  }
  const results = await Promise.all(contributors.map((fn) => fn(tenantId, asOfDate)));
  return results.flat();
}

/**
 * Clears all registered contributors. Primarily used in test isolation.
 */
export function clearForecastContributors(): void {
  contributors.length = 0;
}
