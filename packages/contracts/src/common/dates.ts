import { z } from 'zod';

export type DateOnly = string;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(val: unknown): val is DateOnly {
  if (typeof val !== 'string' || !DATE_ONLY_REGEX.test(val)) {
    return false;
  }

  const [yStr, mStr, dStr] = val.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
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
