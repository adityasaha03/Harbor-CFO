import { describe, it, expect, beforeEach } from "vitest";
import { useTestDb } from "../../../../core/db/test/mongo-test-harness";
import { seedTestMember } from "../../../../test-utils/test-auth-helper";
import { ForbiddenError } from "../../../../core/http/app-error";
import type { ActorContext } from "../../../auth/auth.types";
import { seedAnchorTenant } from "../../../scenarios/__tests__/fixtures/seed-anchor";
import { seedFinancingOffers } from "../../../financing";
import { LedgerEntryModel } from "../../../ledger/ledger.model";
import {
  ActionProposal,
  SandboxOperation,
  FinancingCommitment,
} from "../../../actions/actions.models";
import { runTool } from "../run-tool";
import type { CreateActionProposalToolOutput } from "@harbor/contracts";

describe("B15 createActionProposal Invariant Tests", () => {
  useTestDb();

  const tenantId = "tenant_b15_proposal_invariant";
  const ownerId = "usr_b15_owner";
  const employeeId = "usr_b15_employee";
  const reviewerId = "usr_b15_reviewer";

  const ownerActor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: "owner",
    requestId: "req_owner",
  };

  const employeeActor: ActorContext = {
    tenantId,
    userId: employeeId,
    role: "employee",
    requestId: "req_emp",
  };

  const reviewerActor: ActorContext = {
    tenantId,
    userId: reviewerId,
    role: "reviewer",
    requestId: "req_rev",
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
    await seedTestMember(tenantId, ownerId, "owner");
    await seedTestMember(tenantId, employeeId, "employee");
    await seedTestMember(tenantId, reviewerId, "reviewer");
  });

  it("produces a pending proposal with source: agent and NEVER executes anything (ledger unchanged)", async () => {
    // 1. Check ledger count before
    const ledgerCountBefore = await LedgerEntryModel.countDocuments({
      tenantId,
    });
    const opCountBefore = await SandboxOperation.countDocuments({ tenantId });
    const commitmentCountBefore = await FinancingCommitment.countDocuments({
      tenantId,
    });

    // 2. Call createActionProposal tool
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

    // 3. Verify in database: proposal has source = agent, status = pending
    const proposalDoc = await ActionProposal.findOne({
      _id: data.proposalId,
      tenantId,
    });
    expect(proposalDoc).toBeDefined();
    expect(proposalDoc?.source).toBe("agent");
    expect(proposalDoc?.status).toBe("pending");

    // 4. Assert ZERO executions occurred
    const ledgerCountAfter = await LedgerEntryModel.countDocuments({
      tenantId,
    });
    const opCountAfter = await SandboxOperation.countDocuments({ tenantId });
    const commitmentCountAfter = await FinancingCommitment.countDocuments({
      tenantId,
    });

    expect(ledgerCountAfter).toBe(ledgerCountBefore);
    expect(opCountAfter).toBe(opCountBefore);
    expect(commitmentCountAfter).toBe(commitmentCountBefore);
  });

  it("employee with actions:propose permission can propose an action", async () => {
    const res = await runTool(employeeActor, {
      name: "createActionProposal",
      args: {
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      },
    });

    const data = res.data as CreateActionProposalToolOutput;
    expect(data.status).toBe("pending");
  });

  it("reviewer without actions:propose permission is rejected with ForbiddenError", async () => {
    await expect(
      runTool(reviewerActor, {
        name: "createActionProposal",
        args: {
          offerCode: "bridge-term",
          principalMinor: 6_000_000,
        },
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
