import { createHash } from 'node:crypto';
import type { ScenarioChange } from '@harbor/contracts';

/**
 * Deterministically stringifies any JavaScript value with alphabetically sorted keys.
 */
export function canonicalStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map(canonicalStringify).join(',')}]`;
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes deterministic SHA-256 hex hash for a scenario's changes and baseInputVersion.
 */
export function computeScenarioHash(
  changes: readonly ScenarioChange[],
  baseInputVersion: number,
): string {
  const canonicalPayload = canonicalStringify({
    baseInputVersion,
    changes,
  });
  return createHash('sha256').update(canonicalPayload).digest('hex');
}
