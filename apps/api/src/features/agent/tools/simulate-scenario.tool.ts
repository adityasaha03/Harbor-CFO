import {
  simulateScenarioInputSchema,
  simulateScenarioOutputSchema,
  formatMinor,
  type SimulateScenarioInput,
  type SimulateScenarioOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { scenariosService } from "../../scenarios";

export const simulateScenarioTool: Tool<
  SimulateScenarioInput,
  SimulateScenarioOutput
> = {
  name: "simulateScenario",
  description:
    "Simulate what-if changes (invoice date shifts, supplier terms, financing) and compare against baseline",
  permission: "scenarios:write",
  costClass: "high",
  inputSchema: simulateScenarioInputSchema,
  outputSchema: simulateScenarioOutputSchema,
  async execute(actor, args) {
    const res = await scenariosService.createScenario(actor, {
      name: "Agent simulated scenario",
      changes: args.changes,
    });

    const solvesGap = res.scenarioSummary.liquidityGapMinor === 0;

    return {
      scenarioId: res.scenarioId,
      scenarioHash: res.scenario.scenarioHash,
      minCashDeltaMinor: res.deltas.minCashMinor,
      minCashDeltaFormatted: formatMinor(res.deltas.minCashMinor),
      solvesGap,
      baselineMinCashMinor: res.baselineSummary.minCashMinor,
      baselineMinCashFormatted: formatMinor(
        res.baselineSummary.minCashMinor,
      ),
      scenarioMinCashMinor: res.scenarioSummary.minCashMinor,
      scenarioMinCashFormatted: formatMinor(
        res.scenarioSummary.minCashMinor,
      ),
      evidenceRefs: [
        `scenario:${res.scenarioId}`,
        ...(res.scenario.forecastRunId
          ? [`forecastRun:${res.scenario.forecastRunId}`]
          : []),
      ],
    };
  },
};
