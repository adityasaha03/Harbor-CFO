import { z } from 'zod';

export type DateOnly = string;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isDateOnly(val: unknown): val is DateOnly {
  if (typeof val !== 'string' || !DATE_ONLY_REGEX.test(val)) {
    return false;
  }

  const [yStr, mStr, dStr] = val.split('-');
  return isValidYmd(Number(yStr), Number(mStr), Number(dStr));
}

/**
 * Normalizes various user/CSV date formats into canonical YYYY-MM-DD DateOnly string.
 * Supports:
 * - YYYY-MM-DD (e.g. 2026-10-18)
 * - MM/DD/YYYY or M/D/YYYY (e.g. 10/18/2026, 1/5/2026)
 * - DD/MM/YYYY (e.g. 18/10/2026)
 * - YYYY/MM/DD or YYYY.MM.DD (e.g. 2026/10/18, 2026.10.18)
 * - ISO timestamp format (e.g. 2026-10-18T00:00:00Z)
 *
 * Returns null if the value cannot be parsed into a real calendar date.
 */
export function normalizeDateOnly(val: unknown): DateOnly | null {
  if (typeof val !== 'string') return null;
  const raw = val.trim();
  if (!raw) return null;

  // Check canonical or delimiter-separated YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const ymdMatch = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]);
    const d = Number(ymdMatch[3]);
    if (isValidYmd(y, m, d)) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Check ISO timestamp format (e.g. 2026-10-18T...)
  if (raw.length >= 10 && raw[10] === 'T') {
    const prefix = raw.slice(0, 10);
    const m = prefix.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m && isValidYmd(Number(m[1]), Number(m[2]), Number(m[3]))) {
      return prefix;
    }
  }

  // Check MM/DD/YYYY or DD/MM/YYYY
  const mdyMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (mdyMatch) {
    const p1 = Number(mdyMatch[1]);
    const p2 = Number(mdyMatch[2]);
    const y = Number(mdyMatch[3]);

    // If p1 > 12, it must be DD/MM/YYYY
    if (p1 > 12 && p2 <= 12) {
      if (isValidYmd(y, p2, p1)) {
        return `${String(y).padStart(4, '0')}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
    }

    // Default to MM/DD/YYYY
    if (p1 <= 12 && p2 <= 31) {
      if (isValidYmd(y, p1, p2)) {
        return `${String(y).padStart(4, '0')}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }
    }

    // Fallback to DD/MM/YYYY
    if (p2 <= 12 && p1 <= 31) {
      if (isValidYmd(y, p2, p1)) {
        return `${String(y).padStart(4, '0')}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

export function assertDateOnly(val: unknown): asserts val is DateOnly {
  if (!isDateOnly(val)) {
    throw new TypeError(
      `Invalid DateOnly format; expected YYYY-MM-DD for a real calendar date, got: ${String(val)}`,
    );
  }
}

export const dateOnlySchema = z.string().refine(isDateOnly, {
  message: 'Invalid DateOnly format; expected YYYY-MM-DD for a real calendar date',
});

function formatDateOnly(date: Date): DateOnly {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateOnly: string, n: number): string {
  assertDateOnly(dateOnly);
  if (!Number.isSafeInteger(n)) {
    throw new TypeError(`Expected a safe integer for days, got: ${n}`);
  }

  const [yStr, mStr, dStr] = dateOnly.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return formatDateOnly(date);
}

export function diffDays(a: string, b: string): number {
  assertDateOnly(a);
  assertDateOnly(b);

  const [ayStr, amStr, adStr] = a.split('-');
  const [byStr, bmStr, bdStr] = b.split('-');

  const utcA = Date.UTC(Number(ayStr), Number(amStr) - 1, Number(adStr));
  const utcB = Date.UTC(Number(byStr), Number(bmStr) - 1, Number(bdStr));
  const MS_PER_DAY = 86_400_000;

  return Math.round((utcA - utcB) / MS_PER_DAY);
}

export function eachDay(start: string, count: number): string[] {
  assertDateOnly(start);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError(`Expected a non-negative safe integer for count, got: ${count}`);
  }

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(addDays(start, i));
  }
  return result;
}
