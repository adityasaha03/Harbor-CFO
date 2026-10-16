import {
  getKpisInputSchema,
  getKpisOutputSchema,
  formatMinor,
  type GetKpisInput,
  type GetKpisOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { analyticsService } from "../../analytics";

export const getKpisTool: Tool<GetKpisInput, GetKpisOutput> = {
  name: "getKpis",
  description:
    "Get SME financial KPIs including aging summary, burn rate, runway, and collection quality",
  permission: "finance:read",
  costClass: "low",
  inputSchema: getKpisInputSchema,
  outputSchema: getKpisOutputSchema,
  async execute(actor) {
    const tenantId = actor.tenantId;
    const summary = await analyticsService.getSummary(tenantId);

    const arOverdue =
      (summary.aging.ar.overdue1to30?.amountMinor ?? 0) +
      (summary.aging.ar.overdue31to60?.amountMinor ?? 0) +
      (summary.aging.ar.overdue61plus?.amountMinor ?? 0);
    const apOverdue =
      (summary.aging.ap.overdue1to30?.amountMinor ?? 0) +
      (summary.aging.ap.overdue31to60?.amountMinor ?? 0) +
      (summary.aging.ap.overdue61plus?.amountMinor ?? 0);

    return {
      asOf: summary.asOf,
      currentCashMinor: summary.currentCashMinor,
      currentCashFormatted: formatMinor(summary.currentCashMinor),
      floorMinor: summary.floorMinor,
      floorFormatted: formatMinor(summary.floorMinor),
      arOutstandingMinor: summary.aging.ar.totalMinor,
      arOutstandingFormatted: formatMinor(summary.aging.ar.totalMinor),
      arOverdueMinor: arOverdue,
      arOverdueFormatted: formatMinor(arOverdue),
      apOutstandingMinor: summary.aging.ap.totalMinor,
      apOutstandingFormatted: formatMinor(summary.aging.ap.totalMinor),
      apOverdueMinor: apOverdue,
      apOverdueFormatted: formatMinor(apOverdue),
      monthlyBurnMinor: summary.burn.monthlyBurnMinor,
      monthlyBurnFormatted:
        summary.burn.monthlyBurnMinor !== null
          ? formatMinor(summary.burn.monthlyBurnMinor)
          : null,
      roughRunwayMonths: summary.burn.roughRunwayMonths,
      collectionOnTimeRatePct: summary.collectionQuality.onTimeSharePct,
      evidenceRefs: [`analytics:${summary.asOf}`],
    };
  },
};
