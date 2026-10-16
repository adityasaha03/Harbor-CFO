import { describe, it, expect, beforeEach } from "vitest";
import { useTestDb } from "../../../../core/db/test/mongo-test-harness";
import { seedTestMember } from "../../../../test-utils/test-auth-helper";
import { ValidationError, ForbiddenError } from "../../../../core/http/app-error";
import type { ActorContext } from "../../../auth/auth.types";
import { runTool } from "../run-tool";
import { DeniedError } from "../tool.types";
import { seedAnchorTenant } from "../../../scenarios/__tests__/fixtures/seed-anchor";
import { auditService } from "../../../audit";

describe("B15 runTool Framework Tests", () => {
  useTestDb();

  const tenantId = "tenant_b15_run_tool";
  const ownerId = "usr_b15_owner";
  const reviewerId = "usr_b15_reviewer";

  const ownerActor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: "owner",
    requestId: "req_owner",
  };

  const reviewerActor: ActorContext = {
    tenantId,
    userId: reviewerId,
    role: "reviewer",
    requestId: "req_rev",
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedTestMember(tenantId, ownerId, "owner");
    await seedTestMember(tenantId, reviewerId, "reviewer");
  });

  it("unregistered tool name throws DeniedError with UNREGISTERED_TOOL", async () => {
    await expect(
      runTool(ownerActor, {
        name: "executeMoneyTransfer",
        args: {},
      }),
    ).rejects.toThrow(DeniedError);

    try {
      await runTool(ownerActor, {
        name: "executeMoneyTransfer",
        args: {},
      });
    } catch (err: unknown) {
      expect((err as DeniedError).reason).toBe("UNREGISTERED_TOOL");
    }
  });

  it("unknown argument key is rejected by strict schema validation", async () => {
    await expect(
      runTool(ownerActor, {
        name: "getCashPosition",
        args: {
          unknownProperty: "malicious_payload",
        },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("forged tenantId argument is explicitly rejected with FORBIDDEN_ARGUMENT", async () => {
    await expect(
      runTool(ownerActor, {
        name: "getCashPosition",
        args: {
          tenantId: "forged_other_tenant",
        },
      }),
    ).rejects.toThrow(DeniedError);

    try {
      await runTool(ownerActor, {
        name: "getCashPosition",
        args: {
          tenantId: "forged_other_tenant",
        },
      });
    } catch (err: unknown) {
      expect((err as DeniedError).reason).toBe("FORBIDDEN_ARGUMENT");
    }
  });

  it("forged userId or role argument is explicitly rejected with FORBIDDEN_ARGUMENT", async () => {
    await expect(
      runTool(ownerActor, {
        name: "getCashPosition",
        args: {
          role: "owner",
        },
      }),
    ).rejects.toThrow(DeniedError);
  });

  it("reviewer role calling simulateScenario gets ForbiddenError (permission denied)", async () => {
    await expect(
      runTool(reviewerActor, {
        name: "simulateScenario",
        args: {
          changes: [
            {
              type: "move_receipt",
              invoiceExternalId: "INV-AR-101",
              newExpectedSettlementOn: "2026-11-15",
            },
          ],
        },
      }),
    ).rejects.toThrow(ForbiddenError);

    // Verify audit log recorded the denied decision
    const auditLogs = await auditService.list(tenantId);
    const deniedAudit = auditLogs.items.find(
      (a) =>
        a.action === "agent.tool.simulateScenario" && a.decision === "denied",
    );
    expect(deniedAudit).toBeDefined();
    expect(deniedAudit?.reasonCode).toBe("PERMISSION_DENIED");
  });

  it("budget exhausted throws DeniedError with BUDGET_EXHAUSTED", async () => {
    const budgetContext = {
      budgetRemaining: 0,
    };

    await expect(
      runTool(
        ownerActor,
        {
          name: "getCashPosition",
          args: {},
        },
        budgetContext,
      ),
    ).rejects.toThrow(DeniedError);

    try {
      await runTool(
        ownerActor,
        {
          name: "getCashPosition",
          args: {},
        },
        budgetContext,
      );
    } catch (err: unknown) {
      expect((err as DeniedError).reason).toBe("BUDGET_EXHAUSTED");
    }
  });

  it("consumes per-run budget when remaining budget is sufficient", async () => {
    const budget = {
      remaining: 5,
    };

    const result = await runTool(
      ownerActor,
      {
        name: "getCashPosition",
        args: {},
      },
      { budget },
    );

    expect(result.name).toBe("getCashPosition");
    // getCashPosition has costClass "low" (1 unit)
    expect(budget.remaining).toBe(4);
  });
});
