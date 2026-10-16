import type { ActorContext } from '../auth/auth.types';
import { runTool } from './tools/run-tool';
import type { GetForecastOutput, GetKpisOutput } from '@harbor/contracts';

export interface FallbackResult {
  summary: string;
  evidenceRefs: string[];
}

export async function generateFallbackSummary(
  actor: ActorContext,
  reason: string,
): Promise<FallbackResult> {
  const evidenceRefs: string[] = [];
  let forecastData: GetForecastOutput | undefined;
  let kpisData: GetKpisOutput | undefined;

  try {
    const fcRes = await runTool(actor, { name: 'getForecast', args: {} });
    forecastData = fcRes.data as GetForecastOutput;
    evidenceRefs.push(...fcRes.evidenceRefs);
  } catch {
    // Gracefully handle if forecast tool fails
  }

  try {
    const kpiRes = await runTool(actor, { name: 'getKpis', args: {} });
    kpisData = kpiRes.data as GetKpisOutput;
    evidenceRefs.push(...kpiRes.evidenceRefs);
  } catch {
    // Gracefully handle if kpi tool fails
  }

  const lines: string[] = [
    'Automated Financial Summary (Safe Fallback):',
  ];

  if (kpisData?.currentCashFormatted) {
    lines.push(`- Current Cash: ${kpisData.currentCashFormatted} (As of ${kpisData.asOf})`);
  }

  if (forecastData) {
    lines.push(
      `- 13-Week Minimum Cash: ${forecastData.minCashFormatted} projected on ${forecastData.minCashDate}`,
    );
    lines.push(`- Liquidity Target Floor: ${forecastData.floorFormatted}`);
    if (forecastData.liquidityGapMinor > 0) {
      lines.push(`- Projected Liquidity Gap: ${forecastData.liquidityGapFormatted}`);
    } else {
      lines.push('- No projected floor breach over the 13-week horizon.');
    }
  }

  if (kpisData?.monthlyBurnFormatted) {
    lines.push(`- Estimated Monthly Burn: ${kpisData.monthlyBurnFormatted}`);
  }

  lines.push('');
  lines.push(
    `Note: The AI reasoning engine encountered a temporary condition (${reason}) and generated this deterministic summary directly from verified core calculations. Core data, forecasts, and reports remain accurate.`,
  );

  return {
    summary: lines.join('\n'),
    evidenceRefs: Array.from(new Set(evidenceRefs)),
  };
}
