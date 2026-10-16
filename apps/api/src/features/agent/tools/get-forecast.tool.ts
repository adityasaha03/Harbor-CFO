import {
  getForecastInputSchema,
  getForecastOutputSchema,
  formatMinor,
  type GetForecastInput,
  type GetForecastOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { forecastService, forecastRepository } from "../../forecast";
import { scenariosRepository } from "../../scenarios";
import { tenantsRepository } from "../../tenants";
import { NotFoundError } from "../../../core/http/app-error";

export const getForecastTool: Tool<GetForecastInput, GetForecastOutput> = {
  name: "getForecast",
  description:
    "Get 90-day cash forecast baseline (or simulated scenario forecast) with min cash, floor breaches, and liquidity gap",
  permission: "finance:read",
  costClass: "medium",
  inputSchema: getForecastInputSchema,
  outputSchema: getForecastOutputSchema,
  async execute(actor, args) {
    const tenantId = actor.tenantId;

    if (args.scenarioId) {
      const tenant = await tenantsRepository.findByTenantId(tenantId);
      const currentDatasetVersion = tenant?.datasetVersion ?? 1;
      const scenario = await scenariosRepository.findById(
        tenantId,
        args.scenarioId,
        currentDatasetVersion,
      );
      if (!scenario || scenario.isStale) {
        throw new NotFoundError("Scenario not found or stale");
      }
      if (!scenario.forecastRunId) {
        throw new NotFoundError("Forecast run for scenario not found");
      }
      const run = await forecastRepository.findById(
        tenantId,
        scenario.forecastRunId,
      );
      if (!run) {
        throw new NotFoundError("Forecast run for scenario not found");
      }

      return {
        asOfDate: run.asOfDate,
        horizonDays: run.horizonDays,
        minCashMinor: run.summary.minCashMinor,
        minCashFormatted: formatMinor(run.summary.minCashMinor),
        minCashDate: run.summary.minCashDate,
        liquidityGapMinor: run.summary.liquidityGapMinor,
        liquidityGapFormatted: formatMinor(run.summary.liquidityGapMinor),
        firstBelowFloorDate: run.summary.firstBelowFloorDate ?? null,
        firstNegativeDate: run.summary.firstNegativeDate ?? null,
        floorMinor: run.floorMinor,
        floorFormatted: formatMinor(run.floorMinor),
        scenarioId: args.scenarioId,
        evidenceRefs: [`scenario:${scenario.id}`, `forecastRun:${run.id}`],
      };
    }

    const baseline = await forecastService.getBaseline(tenantId);
    const run = baseline.run;

    return {
      asOfDate: run.asOfDate,
      horizonDays: run.horizonDays,
      minCashMinor: run.summary.minCashMinor,
      minCashFormatted: formatMinor(run.summary.minCashMinor),
      minCashDate: run.summary.minCashDate,
      liquidityGapMinor: run.summary.liquidityGapMinor,
      liquidityGapFormatted: formatMinor(run.summary.liquidityGapMinor),
      firstBelowFloorDate: run.summary.firstBelowFloorDate ?? null,
      firstNegativeDate: run.summary.firstNegativeDate ?? null,
      floorMinor: run.floorMinor,
      floorFormatted: formatMinor(run.floorMinor),
      evidenceRefs: [`forecastRun:${run.id}`],
    };
  },
};
