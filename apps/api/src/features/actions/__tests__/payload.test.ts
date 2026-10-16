import { describe, it, expect } from "vitest";
import {
  canonicalStringify,
  computePayloadHash,
  resolveCanonicalPayload,
  type PayloadHashParams,
} from "../payload";
import type { FinancingOffer } from "@harbor/contracts";

const mockOffer: FinancingOffer = {
  code: "bridge-term",
  version: 1,
  synthetic: true,
  type: "bridge_loan",
  name: "Bridge Term Loan",
  description: "Short-term bridge facility",
  currency: "CNY",
  minAmountMinor: 1_000_000,
  maxAmountMinor: 10_000_000,
  dynamicCap: "none",
  fundingDelayDays: 2,
  upfrontFeeBps: 200,
  flatInterestBps: 300,
  installments: {
    count: 3,
    firstDueAfterFundingDays: 35,
    intervalDays: 14,
  },
  eligiblePurposes: ["bridge", "working_capital"],
  requiresInvoiceEvidence: false,
  requiredProfileFields: ["yearsInOperation"],
  minYearsInOperation: 1,
};

describe("B14 Actions Engine - payload.ts", () => {
  it("resolves canonical payload from offer and principal with calculated fee, interest and schedule", () => {
    const payload = resolveCanonicalPayload(mockOffer, 6_000_000, "2026-10-20");

    expect(payload.offerCode).toBe("bridge-term");
    expect(payload.offerVersion).toBe(1);
    expect(payload.principalMinor).toBe(6_000_000);
    // fundingOn is 2026-10-20 + 2 days = 2026-10-22
    expect(payload.fundingOn).toBe("2026-10-22");
    // upfrontFee: 200 bps of 6,000,000 = 120,000
    expect(payload.upfrontFeeMinor).toBe(120_000);
    // flatInterest: 300 bps of 6,000,000 = 180,000
    expect(payload.interestMinor).toBe(180_000);
    // schedule: 3 installments, total repayment 6,180,000 / 3 = 2,060,000 each
    expect(payload.schedule).toHaveLength(3);
    expect(payload.schedule[0]!.amountMinor).toBe(2_060_000);
    expect(payload.schedule[0]!.dueOn).toBe("2026-11-26");
    expect(payload.schedule[1]!.amountMinor).toBe(2_060_000);
    expect(payload.schedule[1]!.dueOn).toBe("2026-12-10");
    expect(payload.schedule[2]!.amountMinor).toBe(2_060_000);
    expect(payload.schedule[2]!.dueOn).toBe("2026-12-24");
  });

  it("canonicalStringify sorts keys alphabetically and eliminates whitespace", () => {
    const objA = { z: 1, a: 2, m: { y: "hello", b: "world" } };
    const objB = { m: { b: "world", y: "hello" }, a: 2, z: 1 };

    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
    expect(canonicalStringify(objA)).toBe(
      `{"a":2,"m":{"b":"world","y":"hello"},"z":1}`,
    );
  });

  it("key order in payload object does not change the payloadHash", () => {
    const baseParams: PayloadHashParams = {
      tenantId: "tenant_abc",
      actionType: "sandbox_financing_draw",
      payload: {
        offerCode: "bridge-term",
        offerVersion: 1,
        principalMinor: 6_000_000,
        fundingOn: "2026-10-22",
        upfrontFeeMinor: 120_000,
        interestMinor: 180_000,
        schedule: [
          { dueOn: "2026-11-26", amountMinor: 2_060_000 },
          { dueOn: "2026-12-10", amountMinor: 2_060_000 },
          { dueOn: "2026-12-24", amountMinor: 2_060_000 },
        ],
      },
      baseInputVersion: 1,
      offerVersion: 1,
      expiresAt: "2026-10-20T12:00:00.000Z",
    };

    // Construct params with reordered properties
    const reorderedParams: PayloadHashParams = {
      expiresAt: "2026-10-20T12:00:00.000Z",
      offerVersion: 1,
      baseInputVersion: 1,
      actionType: "sandbox_financing_draw",
      tenantId: "tenant_abc",
      payload: {
        interestMinor: 180_000,
        schedule: [
          { amountMinor: 2_060_000, dueOn: "2026-11-26" },
          { dueOn: "2026-12-10", amountMinor: 2_060_000 },
          { amountMinor: 2_060_000, dueOn: "2026-12-24" },
        ],
        upfrontFeeMinor: 120_000,
        principalMinor: 6_000_000,
        fundingOn: "2026-10-22",
        offerVersion: 1,
        offerCode: "bridge-term",
      },
    };

    const hash1 = computePayloadHash(baseParams);
    const hash2 = computePayloadHash(reorderedParams);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("any field change changes the payloadHash", () => {
    const baseParams: PayloadHashParams = {
      tenantId: "tenant_abc",
      actionType: "sandbox_financing_draw",
      payload: {
        offerCode: "bridge-term",
        offerVersion: 1,
        principalMinor: 6_000_000,
        fundingOn: "2026-10-22",
        upfrontFeeMinor: 120_000,
        interestMinor: 180_000,
        schedule: [{ dueOn: "2026-11-26", amountMinor: 6_180_000 }],
      },
      baseInputVersion: 1,
      offerVersion: 1,
      expiresAt: "2026-10-20T12:00:00.000Z",
    };

    const baseHash = computePayloadHash(baseParams);

    // 1. Changing tenantId
    expect(
      computePayloadHash({ ...baseParams, tenantId: "tenant_xyz" }),
    ).not.toBe(baseHash);

    // 2. Changing baseInputVersion
    expect(
      computePayloadHash({ ...baseParams, baseInputVersion: 2 }),
    ).not.toBe(baseHash);

    // 3. Changing offerVersion
    expect(
      computePayloadHash({ ...baseParams, offerVersion: 2 }),
    ).not.toBe(baseHash);

    // 4. Changing expiresAt
    expect(
      computePayloadHash({
        ...baseParams,
        expiresAt: "2026-10-20T12:05:00.000Z",
      }),
    ).not.toBe(baseHash);

    // 5. Changing principalMinor
    expect(
      computePayloadHash({
        ...baseParams,
        payload: { ...baseParams.payload, principalMinor: 6_000_001 },
      }),
    ).not.toBe(baseHash);

    // 6. Changing fundingOn
    expect(
      computePayloadHash({
        ...baseParams,
        payload: { ...baseParams.payload, fundingOn: "2026-10-23" },
      }),
    ).not.toBe(baseHash);

    // 7. Changing fee
    expect(
      computePayloadHash({
        ...baseParams,
        payload: { ...baseParams.payload, upfrontFeeMinor: 120_001 },
      }),
    ).not.toBe(baseHash);

    // 8. Changing schedule amount
    expect(
      computePayloadHash({
        ...baseParams,
        payload: {
          ...baseParams.payload,
          schedule: [{ dueOn: "2026-11-26", amountMinor: 6_180_001 }],
        },
      }),
    ).not.toBe(baseHash);
  });
});
