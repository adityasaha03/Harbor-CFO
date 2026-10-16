import { describe, it, expect, beforeEach } from "vitest";
import { useTestDb } from "../../../../core/db/test/mongo-test-harness";
import { seedTestMember } from "../../../../test-utils/test-auth-helper";
import type { ActorContext } from "../../../auth/auth.types";
import { seedAnchorTenant } from "../../../scenarios/__tests__/fixtures/seed-anchor";
import { seedFinancingOffers } from "../../../financing";
import { runTool } from "../run-tool";
import type {
  GetCashPositionOutput,
  GetForecastOutput,
  GetKpisOutput,
  ListOverdueInvoicesOutput,
  MatchFinancingOutput,
  SimulateScenarioOutput,
  CreateActionProposalToolOutput,
  GetActionStatusOutput,
} from "@harbor/contracts";

describe("B15 Tools Anchor Tenant Exact Numbers", () => {
  useTestDb();

  const tenantId = "tenant_b15_anchor_tools";
  const ownerId = "usr_b15_anchor_owner";

  const ownerActor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: "owner",
    requestId: "req_owner",
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
    await seedTestMember(tenantId, ownerId, "owner");
  });

  it("1. getCashPosition on anchor tenant: exactly 8,000,000 fen (¥80,000.00)", async () => {
    const res = await runTool(ownerActor, {
      name: "getCashPosition",
      args: {},
    });

    const data = res.data as GetCashPositionOutput;
    expect(data.asOf).toBe("2026-10-20");
    expect(data.totalCashMinor).toBe(8_000_000);
    expect(data.totalCashFormatted).toBe("¥80,000.00");
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0]!.code).toBe("1001");
    expect(data.accounts[0]!.balanceMinor).toBe(8_000_000);
    expect(data.evidenceRefs).toContain("account:1001");
  });

  it("2. getForecast on anchor tenant: minCash -2,000,000 fen, gap 5,000,000 fen", async () => {
    const res = await runTool(ownerActor, {
      name: "getForecast",
      args: {},
    });

    const data = res.data as GetForecastOutput;
    expect(data.asOfDate).toBe("2026-10-20");
    expect(data.horizonDays).toBeGreaterThanOrEqual(90);
    expect(data.floorMinor).toBe(3_000_000);
    expect(data.floorFormatted).toBe("¥30,000.00");
    expect(data.minCashMinor).toBe(-2_000_000);
    expect(data.minCashFormatted).toBe("-¥20,000.00");
    expect(data.minCashDate).toBe("2026-11-07");
    expect(data.liquidityGapMinor).toBe(5_000_000);
    expect(data.liquidityGapFormatted).toBe("¥50,000.00");
    expect(data.firstBelowFloorDate).toBe("2026-10-29");
    expect(data.firstNegativeDate).toBe("2026-11-03");
  });

  it("3. getKpis on anchor tenant: AR 6,000,000 fen, overdue 4,000,000 fen, AP 5,500,000 fen", async () => {
    const res = await runTool(ownerActor, {
      name: "getKpis",
      args: {},
    });

    const data = res.data as GetKpisOutput;
    expect(data.asOf).toBe("2026-10-20");
    expect(data.currentCashMinor).toBe(8_000_000);
    expect(data.floorMinor).toBe(3_000_000);
    expect(data.arOutstandingMinor).toBe(6_000_000);
    expect(data.arOverdueMinor).toBe(4_000_000);
    expect(data.apOutstandingMinor).toBe(5_500_000);
  });

  it("4. listOverdueInvoices on anchor tenant: INV-AR-LATE 4,000,000 fen (25 days overdue)", async () => {
    const res = await runTool(ownerActor, {
      name: "listOverdueInvoices",
      args: { minDays: 1 },
    });

    const data = res.data as ListOverdueInvoicesOutput;
    expect(data.count).toBe(1);
    expect(data.totalOverdueMinor).toBe(4_000_000);
    expect(data.totalOverdueFormatted).toBe("¥40,000.00");
    expect(data.invoices[0]!.externalId).toBe("INV-AR-LATE");
    expect(data.invoices[0]!.daysOverdue).toBe(25);
    expect(data.invoices[0]!.outstandingMinor).toBe(4_000_000);
    expect(data.invoices[0]!.counterpartyMaskedName).toBeTruthy();
    expect(data.evidenceRefs).toContain("invoice:INV-AR-LATE");
  });

  it("5. matchFinancing on anchor tenant: ranks eligible remedies with cashAtDay21 3,880,000 fen", async () => {
    const res = await runTool(ownerActor, {
      name: "matchFinancing",
      args: {},
    });

    const data = res.data as MatchFinancingOutput;
    expect(data.requiredGapMinor).toBe(5_000_000);
    expect(data.requiredGapFormatted).toBe("¥50,000.00");
    expect(data.eligibleOffers.length).toBeGreaterThan(0);

    const bridgeOffer = data.eligibleOffers.find(
      (o) => o.code === "bridge-term",
    );
    expect(bridgeOffer).toBeDefined();
    // B14 / B12 anchor numbers: day-21 cash with bridge loan is 3,880,000 fen
    expect(bridgeOffer?.cashAtDay21Minor).toBe(3_880_000);
    expect(bridgeOffer?.cashAtDay21Formatted).toBe("¥38,800.00");
    expect(bridgeOffer?.principalMinor).toBe(6_000_000);
  });

  it("6. simulateScenario on anchor tenant: evaluates deltas and returns scenarioId", async () => {
    const res = await runTool(ownerActor, {
      name: "simulateScenario",
      args: {
        changes: [
          {
            type: "add_financing",
            offerCode: "bridge-term",
            principalMinor: 6_000_000,
          },
        ],
      },
    });

    const data = res.data as SimulateScenarioOutput;
    expect(data.scenarioId).toBeTruthy();
    expect(data.baselineMinCashMinor).toBe(-2_000_000);
    expect(data.scenarioMinCashMinor).toBeGreaterThan(-2_000_000);
    expect(data.minCashDeltaMinor).toBeGreaterThan(0);
    expect(typeof data.solvesGap).toBe("boolean");
    expect(data.evidenceRefs).toContain(`scenario:${data.scenarioId}`);
  });

  it("7. createActionProposal on anchor tenant: proposes bridge-term and returns pending proposal", async () => {
    const res = await runTool(ownerActor, {
      name: "createActionProposal",
      args: {
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      },
    });

    const data = res.data as CreateActionProposalToolOutput;
    expect(data.proposalId).toBeTruthy();
    expect(data.status).toBe("pending");
    expect(data.principalMinor).toBe(6_000_000);
    expect(data.principalFormatted).toBe("¥60,000.00");
    expect(data.upfrontFeeMinor).toBe(120_000);
    expect(data.upfrontFeeFormatted).toBe("¥1,200.00");
    expect(data.payloadHash).toHaveLength(64);
    expect(data.evidenceRefs).toContain(`proposal:${data.proposalId}`);
  });

  it("8. getActionStatus on anchor tenant: retrieves status of created proposal", async () => {
    // 1. Propose
    const propRes = await runTool(ownerActor, {
      name: "createActionProposal",
      args: {
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      },
    });
    const propData = propRes.data as CreateActionProposalToolOutput;

    // 2. Query status
    const statusRes = await runTool(ownerActor, {
      name: "getActionStatus",
      args: {
        proposalId: propData.proposalId,
      },
    });

    const statusData = statusRes.data as GetActionStatusOutput;
    expect(statusData.proposalId).toBe(propData.proposalId);
    expect(statusData.status).toBe("pending");
    expect(statusData.offerCode).toBe("bridge-term");
    expect(statusData.principalMinor).toBe(6_000_000);
    expect(statusData.payloadHash).toBe(propData.payloadHash);
    expect(statusData.operationId).toBeNull();
  });
});
