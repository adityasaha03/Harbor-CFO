import { registerForecastContributor } from "../forecast/forecast.sources";
import { actionsRepository } from "./actions.repository";

export * from "./actions.constants";
export * from "./actions.models";
export * from "./payload";
export * from "./actions.repository";
export * from "./proposals.service";
export * from "./approvals.service";
export * from "./execution.service";
export * from "./actions.controller";
export * from "./actions.routes";

// Register forecast contributor providing active financingCommitments repayment schedules
registerForecastContributor(async (tenantId: string, asOfDate: string) => {
  const activeCommitments =
    await actionsRepository.listActiveCommitmentSchedules(tenantId);

  return activeCommitments.map((comm) => ({
    id: comm.operationId,
    label: `Financing commitment ${comm.offerCode}`,
    flows: comm.schedule
      .filter((s) => s.dueOn > asOfDate)
      .map((s) => ({
        kind: "repayment" as const,
        on: s.dueOn,
        amountMinor: s.amountMinor,
      })),
  }));
});
