import { createHash } from "node:crypto";
import { addDays, type FinancingOffer } from "@harbor/contracts";
import type { CanonicalPayload, CanonicalScheduleItem } from "@harbor/contracts";
import { buildSchedule } from "../financing/engine/schedule";

/**
 * Deterministically stringifies any JavaScript value with alphabetically sorted keys.
 * Omits any extraneous whitespace.
 */
export function canonicalStringify(val: unknown): string {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (val instanceof Date) {
    return JSON.stringify(val.toISOString());
  }
  if (Array.isArray(val)) {
    return `[${val.map(canonicalStringify).join(",")}]`;
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`,
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Resolves financing terms from catalog offer and principal.
 * Never trusts any client-provided fee, interest, or installment numbers.
 */
export function resolveCanonicalPayload(
  offer: FinancingOffer,
  principalMinor: number,
  asOfDate: string,
  fundingOnOverride?: string,
): CanonicalPayload {
  const fundingOn =
    fundingOnOverride ?? addDays(asOfDate, offer.fundingDelayDays);

  const schedule = buildSchedule(offer, principalMinor, fundingOn);

  const canonicalSchedule: CanonicalScheduleItem[] = schedule.installments.map(
    (item) => ({
      dueOn: item.dueOn,
      amountMinor: item.amountMinor,
    }),
  );

  return {
    offerCode: offer.code,
    offerVersion: offer.version,
    principalMinor,
    fundingOn,
    upfrontFeeMinor: schedule.upfrontFeeMinor,
    interestMinor: schedule.interestMinor,
    schedule: canonicalSchedule,
  };
}

export interface PayloadHashParams {
  tenantId: string;
  actionType: string;
  payload: CanonicalPayload;
  baseInputVersion: number;
  offerVersion: number;
  expiresAt: Date | string;
}

/**
 * Computes sha256 of canonical JSON({ tenantId, actionType, payload, baseInputVersion, offerVersion, expiresAt })
 * where canonical JSON has sorted keys and no whitespace.
 */
export function computePayloadHash(params: PayloadHashParams): string {
  const expiresAtStr =
    params.expiresAt instanceof Date
      ? params.expiresAt.toISOString()
      : params.expiresAt;

  const dataToHash = {
    actionType: params.actionType,
    baseInputVersion: params.baseInputVersion,
    expiresAt: expiresAtStr,
    offerVersion: params.offerVersion,
    payload: params.payload,
    tenantId: params.tenantId,
  };

  const canonical = canonicalStringify(dataToHash);
  return createHash("sha256").update(canonical).digest("hex");
}
