import type { ScenarioChange } from '@harbor/contracts';

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  buildChanges: (params: PresetParams) => ScenarioChange[];
}

interface PresetParams {
  offerCode?: string;
  amountMinor?: number;
}

/**
 * "Collect overdue invoice early" preset.
 * Moves INV-AR-LATE to 2026-10-30 (within the 21-day horizon).
 */
const collectOverduePreset: ScenarioPreset = {
  id: 'collect-overdue',
  label: 'Collect overdue invoice early',
  description: 'Move the largest overdue AR receipt into the forecast horizon.',
  buildChanges: () => [
    {
      type: 'move_receipt',
      invoiceExternalId: 'INV-AR-LATE',
      newExpectedSettlementOn: '2026-10-30',
    },
  ],
};

/**
 * "Bridge loan" preset.
 * Adds the bridge-term offer at ¥60,000 principal.
 */
const bridgeLoanPreset: ScenarioPreset = {
  id: 'bridge-loan',
  label: 'Bridge loan',
  description: 'Draw a bridge loan to cover the immediate liquidity gap.',
  buildChanges: (params) => [
    {
      type: 'add_financing',
      offerCode: params.offerCode ?? 'bridge-term',
      principalMinor: params.amountMinor ?? 6_000_000,
    },
  ],
};

/**
 * "Collect early + small revolving draw" preset.
 * Combines the overdue collection move with a revolving credit draw.
 */
const collectPlusRevolverPreset: ScenarioPreset = {
  id: 'collect-plus-revolver',
  label: 'Collect early + small revolving draw',
  description: 'Move the overdue receipt and draw a small revolving credit line.',
  buildChanges: (params) => [
    {
      type: 'move_receipt',
      invoiceExternalId: 'INV-AR-LATE',
      newExpectedSettlementOn: '2026-10-30',
    },
    {
      type: 'add_financing',
      offerCode: params.offerCode ?? 'revolving-credit',
      principalMinor: params.amountMinor ?? 1_200_000,
    },
  ],
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  collectOverduePreset,
  bridgeLoanPreset,
  collectPlusRevolverPreset,
];

/**
 * Parse preset params from URL search string.
 * Format: `?preset=offer:<code>&amount=<minor>`
 */
export function parsePresetParams(
  searchParams: URLSearchParams,
): { presetId: string; offerCode?: string; amountMinor?: number } | null {
  const presetRaw = searchParams.get('preset');
  if (!presetRaw) return null;

  if (presetRaw.startsWith('offer:')) {
    const offerCode = presetRaw.slice(6);
    const amountStr = searchParams.get('amount');
    const amountMinor = amountStr ? parseInt(amountStr, 10) : undefined;

    // Determine which preset fits
    if (offerCode === 'bridge-term') {
      return { presetId: 'bridge-loan', offerCode, amountMinor };
    }
    if (offerCode === 'revolving-credit') {
      return { presetId: 'collect-plus-revolver', offerCode, amountMinor };
    }

    // Default: treat any offer link as a bridge-style preset
    return { presetId: 'bridge-loan', offerCode, amountMinor };
  }

  return { presetId: presetRaw };
}
