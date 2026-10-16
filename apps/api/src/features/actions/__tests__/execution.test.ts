import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../app";
import { useTestDb } from "../../../core/db/test/mongo-test-harness";
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from "../../../test-utils/test-auth-helper";
import { seedAnchorTenant } from "../../scenarios/__tests__/fixtures/seed-anchor";
import { seedFinancingOffers, FinancingOfferModel } from "../../financing";
import { forecastService } from "../../forecast";
import { LedgerEntryModel } from "../../ledger";
import { tenantsRepository } from "../../tenants";
import { getDb } from "../../../core/db/mongo";
import {
  Approval,
  SandboxOperation,
  FinancingCommitment,
} from "../actions.models";
import { actionsRepository } from "../actions.repository";

describe("B14 Actions - Execution Tests", () => {
  useTestDb();
  const app = createApp();

  const tenantId = "tenant_actions_execution_test";

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
  });

  async function createAndApproveProposal(ownerId: string, ownerToken: string, principalMinor = 6_000_000) {
    const propRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor,
      });

    expect(propRes.status).toBe(201);
    const proposal = propRes.body.data;

    const appRes = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({ payloadHash: proposal.payloadHash });

    expect(appRes.status).toBe(200);
    return {
      proposal: appRes.body.data.proposal,
      approval: appRes.body.data.approval,
    };
  }

  it("Execution happy path on the anchor tenant: day-21 cash goes from -2,000,000 to 3,880,000 fen with the bridge, exactly 2 ledger entries, 1 commitment, 1 operation, datasetVersion +1", async () => {
    const ownerId = "usr_exec_happy";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    // 1. Verify baseline cash before execution is -2,000,000 fen (-20,000 CNY)
    const baselineBefore = await forecastService.getBaseline(tenantId);
    const day21Before = baselineBefore.run.points[21];
    expect(day21Before?.closingMinor).toBe(-2_000_000);

    const initialDatasetVersion = baselineBefore.inputVersion;

    // 2. Propose & approve 6,000,000 fen bridge term loan
    const { proposal } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    // Count ledger entries before
    const ledgerCountBefore = await LedgerEntryModel.countDocuments({ tenantId });

    // 3. Execute with Idempotency-Key
    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-anchor-01");

    expect(res.status).toBe(200);
    const { operation, commitment, proposal: executedProposal } = res.body.data;

    expect(operation.idempotencyKey).toBe("idemp-anchor-01");
    expect(operation.operationId).toMatch(/^op_[a-f0-9]+$/);
    expect(operation.type).toBe("sandbox_financing_draw");
    expect(executedProposal.status).toBe("executed");
    expect(executedProposal.operationId).toBe(operation.operationId);

    // 4. Verify datasetVersion bumped +1
    const settingsAfter = await tenantsRepository.findByTenantId(tenantId);
    expect(settingsAfter?.datasetVersion).toBe(initialDatasetVersion + 1);

    // 5. Verify exactly 2 new ledger entries on fundingOn (2026-10-22)
    const ledgerCountAfter = await LedgerEntryModel.countDocuments({ tenantId });
    expect(ledgerCountAfter).toBe(ledgerCountBefore + 2);

    const drawEntry = await LedgerEntryModel.findOne({
      tenantId,
      operationId: operation.operationId,
      kind: "sandbox_financing_draw",
    });
    expect(drawEntry).toBeDefined();
    expect(drawEntry?.amountMinor).toBe(6_000_000);
    expect(drawEntry?.category).toBe("loan_draw");
    expect(drawEntry?.bookedOn).toBe("2026-10-22");

    const feeEntry = await LedgerEntryModel.findOne({
      tenantId,
      operationId: operation.operationId,
      kind: "sandbox_financing_fee",
    });
    expect(feeEntry).toBeDefined();
    expect(feeEntry?.amountMinor).toBe(-120_000); // 200 bps fee
    expect(feeEntry?.category).toBe("loan_fee");
    expect(feeEntry?.bookedOn).toBe("2026-10-22");

    // 6. Verify 1 commitment created with 3 repayments
    expect(commitment.offerCode).toBe("bridge-term");
    expect(commitment.principalMinor).toBe(6_000_000);
    expect(commitment.schedule).toHaveLength(3);

    // 7. Verify post-execution baseline forecast: day-21 cash is now exactly 3,880,000 fen!
    const baselineAfter = await forecastService.getBaseline(tenantId);
    const day21After = baselineAfter.run.points[21];
    expect(day21After?.closingMinor).toBe(3_880_000);
  });

  it("Idempotency: same key twice returns the same operation without mutating ledger; different hash returns 409", async () => {
    const ownerId = "usr_exec_idemp";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    const { proposal } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    // First call
    const res1 = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-key-reuse-01");

    expect(res1.status).toBe(200);
    const opId1 = res1.body.data.operation.operationId;
    const ledgerCountAfterFirst = await LedgerEntryModel.countDocuments({ tenantId });

    // Second call with same key
    const res2 = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-key-reuse-01");

    expect(res2.status).toBe(200);
    expect(res2.body.data.operation.operationId).toBe(opId1);

    // Ledger must not have duplicated
    const ledgerCountAfterSecond = await LedgerEntryModel.countDocuments({ tenantId });
    expect(ledgerCountAfterSecond).toBe(ledgerCountAfterFirst);

    // Reusing same idempotency key for another proposal with different hash returns 409
    const { proposal: proposal2 } = await createAndApproveProposal(ownerId, ownerToken, 7_000_000);
    const conflictRes = await request(app)
      .post(`/api/v1/action-proposals/${proposal2.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-key-reuse-01");

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.message).toContain("Idempotency key was already used");
  });

  it("Concurrency: 10 parallel executes of the same approval produce exactly one mutation", async () => {
    const ownerId = "usr_exec_concur";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    const { proposal } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    const initialDatasetVersion = (await tenantsRepository.findByTenantId(tenantId))!.datasetVersion;
    const initialLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });

    // Launch 10 simultaneous execute requests with unique idempotency keys
    const requests = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post(`/api/v1/action-proposals/${proposal.id}/execute`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-Id", tenantId)
        .set("Idempotency-Key", `idemp-concur-${i}`),
    );

    const results = await Promise.all(requests);

    const successful = results.filter((r) => r.status === 200);
    const conflicted = results.filter((r) => r.status === 409);

    // Exactly 1 must succeed; the remaining 9 must be rejected (409 Conflict)
    expect(successful).toHaveLength(1);
    expect(conflicted).toHaveLength(9);

    // Exactly one operation created
    const opCount = await SandboxOperation.countDocuments({
      tenantId,
      proposalId: proposal.id,
    });
    expect(opCount).toBe(1);

    // Exactly 2 ledger entries added
    const finalLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });
    expect(finalLedgerCount).toBe(initialLedgerCount + 2);

    // Dataset version incremented by exactly 1
    const finalSettings = await tenantsRepository.findByTenantId(tenantId);
    expect(finalSettings?.datasetVersion).toBe(initialDatasetVersion + 1);
  });

  it("Mutated offer terms (version bump) after proposal invalidate the approval", async () => {
    const ownerId = "usr_exec_mutate";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    const propRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      });

    const proposal = propRes.body.data;

    // Mutate offer version in catalog from 1 to 2
    await FinancingOfferModel.updateOne(
      { code: "bridge-term" },
      { $set: { version: 2 } },
    );

    // Approval must fail with 409 Conflict
    const appRes = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({ payloadHash: proposal.payloadHash });

    expect(appRes.status).toBe(409);
    expect(appRes.body.error.message).toContain("terms have been updated");
  });

  it("Role revoked between approval and execution blocks execution and changes nothing", async () => {
    const ownerId = "usr_exec_revoke";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    const { proposal } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    const initialLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });

    // Revoke owner role in database (demote to reviewer)
    const db = getDb();
    await db.collection("member").updateOne(
      { userId: ownerId },
      { $set: { role: "reviewer" } },
    );

    // Attempt execution
    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-revoked-01");

    expect(res.status).toBe(403);

    // Verify nothing changed in ledger or operations
    const finalLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });
    expect(finalLedgerCount).toBe(initialLedgerCount);

    const op = await SandboxOperation.findOne({ tenantId, proposalId: proposal.id });
    expect(op).toBeNull();
  });

  it("Rolled-back transaction test (force a failure): zero partial writes, approval still unconsumed", async () => {
    const ownerId = "usr_exec_rollback";
    await seedTestMember(tenantId, ownerId, "owner");
    const ownerToken = await issueTestToken(ownerId);

    const { proposal, approval } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    const initialLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });

    // Mock createSandboxOperation to throw an unexpected database error
    const spy = vi
      .spyOn(actionsRepository, "createSandboxOperation")
      .mockRejectedValueOnce(new Error("Simulated database failure during operation insert"));

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-rollback-01");

    expect(res.status).toBe(500);
    spy.mockRestore();

    // Verify zero partial writes in ledger and commitments
    const finalLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });
    expect(finalLedgerCount).toBe(initialLedgerCount);

    const comm = await FinancingCommitment.findOne({ tenantId, offerCode: "bridge-term" });
    expect(comm).toBeNull();

    // Approval must remain UNCONSUMED
    const dbApproval = await Approval.findById(approval.id);
    expect(dbApproval?.consumedAt).toBeNull();
  });

  it("Employee calling execute directly gets 403 and ledger/approval state is unchanged", async () => {
    const ownerId = "usr_exec_guard_owner";
    const employeeId = "usr_exec_guard_emp";
    await seedTestMember(tenantId, ownerId, "owner");
    await seedTestMember(tenantId, employeeId, "employee");
    const ownerToken = await issueTestToken(ownerId);
    const employeeToken = await issueTestToken(employeeId);

    const { proposal, approval } = await createAndApproveProposal(ownerId, ownerToken, 6_000_000);

    const initialLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/execute`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Tenant-Id", tenantId)
      .set("Idempotency-Key", "idemp-emp-01");

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("Insufficient permissions");

    // Verify state unchanged
    const finalLedgerCount = await LedgerEntryModel.countDocuments({ tenantId });
    expect(finalLedgerCount).toBe(initialLedgerCount);

    const dbApproval = await Approval.findById(approval.id);
    expect(dbApproval?.consumedAt).toBeNull();
  });
});
