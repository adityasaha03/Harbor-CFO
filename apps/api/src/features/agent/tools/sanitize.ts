import { formatMinor } from "@harbor/contracts";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const SENSITIVE_KEY_REGEX = /^(?:accountNumber|account_number|email|userEmail|password|secret|token)$/i;

/**
 * Masks a counterparty or entity name to prevent privacy leaks.
 * E.g. "Acme Corp Ltd" -> "Acm***"
 * If input is already masked (e.g. contains "***"), it is preserved.
 */
export function maskName(name: string): string {
  if (!name) return "***";
  const trimmed = name.trim();
  if (trimmed.includes("***")) {
    return trimmed;
  }
  if (trimmed.length <= 2) {
    return `${trimmed[0]}***`;
  }
  return `${trimmed.slice(0, 3)}***`;
}

/**
 * Truncates untrusted free text to a safe length (max 200 chars).
 */
export function truncateUntrustedText(
  text?: string | null,
  maxLen = 200,
): string | undefined {
  if (!text) return undefined;
  return text.slice(0, maxLen);
}

/**
 * Formats a minor unit amount and returns both the raw minor integer and formatted string.
 */
export function sanitizeMoney(minor: number, currency = "CNY"): {
  minor: number;
  formatted: string;
} {
  return {
    minor,
    formatted: formatMinor(minor, currency),
  };
}

/**
 * Recursively asserts that a data object does not contain PII or secret fields:
 * - No forbidden keys (accountNumber, email, etc.)
 * - No email addresses in strings
 */
export function assertNoPii(data: unknown, path = "root"): void {
  if (data === null || data === undefined) return;

  if (typeof data === "string") {
    if (EMAIL_REGEX.test(data)) {
      throw new Error(`PII detected: string at ${path} contains an email address`);
    }
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => assertNoPii(item, `${path}[${index}]`));
    return;
  }

  if (typeof data === "object") {
    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        throw new Error(`PII detected: forbidden key "${key}" at ${path}`);
      }
      assertNoPii(val, `${path}.${key}`);
    }
  }
}
