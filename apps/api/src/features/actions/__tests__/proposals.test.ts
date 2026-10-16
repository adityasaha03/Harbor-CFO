import type { ScenarioComparison } from "@harbor/contracts";
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
import { scenariosRepository } from "../../scenarios";
import { tenantsRepository } from "../../tenants";

describe("B14 Actions - Proposal Tests", () => {
  useTestDb();
  const app = createApp();

  const tenantId = "tenant_actions_proposals_test";
  const ownerId = "usr_proposals_owner";
  const employeeId = "usr_proposals_emp";
  const reviewerId = "usr_proposals_rev";

  let ownerToken: string;
  let employeeToken: string;
  let reviewerToken: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantId, ownerId, "owner");
    await seedTestMember(tenantId, employeeId, "employee");
    await seedTestMember(tenantId, reviewerId, "reviewer");

    ownerToken = await issueTestToken(ownerId);
    employeeToken = await issueTestToken(employeeId);
    reviewerToken = await issueTestToken(reviewerId);

    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
  });

  it("employee and owner can propose an action (201), reviewer cannot (403)", async () => {
    const payload = {
      actionType: "sandbox_financing_draw",
      offerCode: "bridge-term",
      principalMinor: 6_000_000,
    };

    // Employee propose -> 201
    const empRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Tenant-Id", tenantId)
      .send(payload);

    expect(empRes.status).toBe(201);
    expect(empRes.body.data.id).toBeDefined();
    expect(empRes.body.data.status).toBe("pending");
    expect(empRes.body.data.source).toBe("user");
    expect(empRes.body.data.proposerId).toBe(employeeId);

    // Reviewer propose -> 403
    const revRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${reviewerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send(payload);

    expect(revRes.status).toBe(403);
  });

  it("fails with 400 when gate checks fail (e.g. principal outside offer range or unknown offer)", async () => {
    // 1. Unknown offer
    const unknownRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "unknown-loan",
        principalMinor: 1_000_000,
      });

    expect(unknownRes.status).toBe(404);

    // 2. Principal below minimum
    const belowMinRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor: 100_000, // min is 1,000,000 fen
      });

    expect(belowMinRes.status).toBe(400);
    expect(belowMinRes.body.error.message).toContain("outside offer range");
  });

  it("fails with 409 when referenced scenario is stale", async () => {
    // 1. Create scenario at datasetVersion = 1
    const scenario = await scenariosRepository.create(tenantId, {
      name: "Test scenario for proposal",
      baseInputVersion: 1,
      changes: [
        {
          type: "move_receipt",
          invoiceExternalId: "INV-AR-LATE",
          newExpectedSettlementOn: "2026-10-30",
        },
      ],
      scenarioHash: "abc123hash",
      comparison: {} as unknown as ScenarioComparison,
      createdBy: ownerId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Bump tenant datasetVersion to 2
    await tenantsRepository.bumpDatasetVersion(tenantId);

    // 3. Propose action referencing the scenario -> 409 Conflict
    const res = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
        scenarioId: scenario.id,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("stale");
  });

  it("ignores any client-supplied fee, interest, or schedule values and resolves them from server catalog", async () => {
    const payload = {
      actionType: "sandbox_financing_draw",
      offerCode: "bridge-term",
      principalMinor: 6_000_000,
      // Injected malicious/manipulated client fields:
      upfrontFeeMinor: 0,
      interestMinor: 0,
      schedule: [],
    };

    const res = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send(payload);

    expect(res.status).toBe(201);
    const data = res.body.data;

    // Server-computed values must be present regardless of client payload
    expect(data.canonicalPayload.upfrontFeeMinor).toBe(120_000); // 200 bps of 6,000,000 fen
    expect(data.canonicalPayload.interestMinor).toBe(180_000); // 300 bps of 6,000,000 fen
    expect(data.canonicalPayload.schedule).toHaveLength(3);
    expect(data.canonicalPayload.fundingOn).toBe("2026-10-22");
  });

  it("retrieves proposal by ID and lists proposals with lazy expiration", async () => {
    const createRes = await request(app)
      .post("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Tenant-Id", tenantId)
      .send({
        actionType: "sandbox_financing_draw",
        offerCode: "bridge-term",
        principalMinor: 6_000_000,
      });

    const proposalId = createRes.body.data.id;

    // GET by ID
    const getRes = await request(app)
      .get(`/api/v1/action-proposals/${proposalId}`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .set("X-Tenant-Id", tenantId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(proposalId);
    expect(getRes.body.data.status).toBe("pending");

    // List proposals
    const listRes = await request(app)
      .get("/api/v1/action-proposals")
      .set("Authorization", `Bearer ${reviewerToken}`)
      .set("X-Tenant-Id", tenantId);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((p: { id: string }) => p.id === proposalId)).toBe(true);
  });
});
