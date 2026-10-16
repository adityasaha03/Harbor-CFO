import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app";
import { useTestDb } from "../../../core/db/test/mongo-test-harness";
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from "../../../test-utils/test-auth-helper";
import { seedAnchorTenant } from "../../scenarios/__tests__/fixtures/seed-anchor";
import { seedFinancingOffers } from "../../financing";
import { tenantsRepository } from "../../tenants";
import { ActionProposal } from "../actions.models";

describe("B14 Actions - Approval Tests", () => {
  useTestDb();
  const app = createApp();

  const tenantId = "tenant_actions_approvals_test";
  const ownerId = "usr_approvals_owner";
  const employeeId = "usr_approvals_emp";

  let ownerToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantId, ownerId, "owner");
    await seedTestMember(tenantId, employeeId, "employee");

    ownerToken = await issueTestToken(ownerId);
    employeeToken = await issueTestToken(employeeId);

    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
  });

  async function createTestProposal() {
    const res = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      });

    expect(res.status).toBe(201);
    return res.body.data;
  }

  it("employee calling approve gets 403", async () => {
    const proposal = await createTestProposal();

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        payloadHash: proposal.payloadHash,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("Insufficient permissions");
  });

  it("fails with 409 when tenant datasetVersion is bumped after proposal (stale version)", async () => {
    const proposal = await createTestProposal();

    // Bump datasetVersion from 1 to 2
    await tenantsRepository.bumpDatasetVersion(tenantId);

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        payloadHash: proposal.payloadHash,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("stale");
  });

  it("fails with 409 when payloadHash does not match", async () => {
    const proposal = await createTestProposal();

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        payloadHash: "deadbeef00000000000000000000000000000000000000000000000000000000",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("Payload hash mismatch");
  });

  it("fails with 409 when proposal has expired", async () => {
    const proposal = await createTestProposal();

    // Force proposal expiresAt to the past
    await ActionProposal.updateOne(
      { _id: proposal.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        payloadHash: proposal.payloadHash,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("expired");
  });

  it("owner happy path: successfully approves proposal and creates single-use approval", async () => {
    const proposal = await createTestProposal();

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/approve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        payloadHash: proposal.payloadHash,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.proposal.status).toBe("approved");
    expect(res.body.data.approval.id).toBeDefined();
    expect(res.body.data.approval.payloadHash).toBe(proposal.payloadHash);
    expect(res.body.data.approval.approverRole).toBe("owner");
    expect(res.body.data.approval.consumedAt).toBeNull();
  });

  it("owner can reject proposal", async () => {
    const proposal = await createTestProposal();

    const res = await request(app)
      .post(`/api/v1/action-proposals/${proposal.id}/reject`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({ reason: "Terms not suitable" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("rejected");
  });
});
