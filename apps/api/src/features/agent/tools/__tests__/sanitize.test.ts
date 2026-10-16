import { describe, it, expect } from "vitest";
import {
  maskName,
  truncateUntrustedText,
  assertNoPii,
  sanitizeMoney,
} from "../sanitize";
import { listRegisteredTools } from "../registry";

describe("B15 Sanitization Tests", () => {
  describe("maskName", () => {
    it("masks counterparty names with 3 visible chars and asterisks", () => {
      expect(maskName("Acme Corp")).toBe("Acm***");
      expect(maskName("Shenzhen Logistics Co")).toBe("She***");
    });

    it("masks short names with 1 visible char and asterisks", () => {
      expect(maskName("AB")).toBe("A***");
      expect(maskName("X")).toBe("X***");
    });

    it("preserves already masked names", () => {
      expect(maskName("Supplier A***")).toBe("Supplier A***");
    });
  });

  describe("truncateUntrustedText", () => {
    it("truncates free text longer than 200 chars to exactly 200 chars", () => {
      const longText = "A".repeat(350);
      const truncated = truncateUntrustedText(longText, 200);
      expect(truncated).toHaveLength(200);
      expect(truncated).toBe("A".repeat(200));
    });

    it("leaves shorter text untouched", () => {
      const short = "Standard supplier payment";
      expect(truncateUntrustedText(short, 200)).toBe(short);
    });

    it("handles null or undefined gracefully", () => {
      expect(truncateUntrustedText(null)).toBeUndefined();
      expect(truncateUntrustedText(undefined)).toBeUndefined();
    });
  });

  describe("sanitizeMoney", () => {
    it("returns minor units integer and formatted string", () => {
      const res = sanitizeMoney(3_880_000);
      expect(res.minor).toBe(3_880_000);
      expect(res.formatted).toBe("¥38,800.00");
    });
  });

  describe("assertNoPii", () => {
    it("passes for clean domain outputs", () => {
      const cleanData = {
        asOf: "2026-10-20",
        totalCashMinor: 8_000_000,
        totalCashFormatted: "¥80,000.00",
        accounts: [
          {
            code: "1001",
            maskedName: "Primary Operating Account",
            balanceMinor: 8_000_000,
            balanceFormatted: "¥80,000.00",
          },
        ],
      };

      expect(() => assertNoPii(cleanData)).not.toThrow();
    });

    it("throws when string contains an email address", () => {
      const dirtyData = {
        name: "John Doe",
        contact: "Reach me at john.doe@example.com for payment",
      };

      expect(() => assertNoPii(dirtyData)).toThrow(/PII detected.*email/i);
    });

    it("throws when object contains forbidden sensitive key like accountNumber", () => {
      const dirtyData = {
        code: "1001",
        accountNumber: "6222021000123456789",
      };

      expect(() => assertNoPii(dirtyData)).toThrow(/PII detected.*accountNumber/i);
    });
  });

  describe("no description leakage elsewhere", () => {
    it("only listOverdueInvoices includes untrustedText; no other tool has free text descriptions", () => {
      const tools = listRegisteredTools();

      for (const tool of tools) {
        if (tool.name === "listOverdueInvoices") continue;

        // Verify output schema has no description or untrustedText properties
        const schema = tool.outputSchema as unknown as { _def?: { shape?: () => Record<string, unknown> }; shape?: Record<string, unknown> };
        const shape = schema?._def?.shape?.() ?? schema?.shape ?? {};

        expect(shape["description"]).toBeUndefined();
        expect(shape["untrustedText"]).toBeUndefined();
        expect(shape["notes"]).toBeUndefined();
      }
    });
  });
});
