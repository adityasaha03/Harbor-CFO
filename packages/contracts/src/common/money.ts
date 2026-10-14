import Decimal from 'decimal.js';
import { z } from 'zod';

export function assertSafeMinor(value: number): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Expected a safe integer for minor units, got: ${value}`);
  }
}

export const minorSchema = z
  .number()
  .int()
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Amount must be a safe integer',
  });

export const positiveMinorSchema = z
  .number()
  .int()
  .positive()
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Amount must be a positive safe integer',
  });

export const nonNegativeMinorSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Amount must be a non-negative safe integer',
  });

const MONEY_STRING_REGEX = /^[+-]?\d+(?:\.\d{1,2})?$/;

export function toMinor(amountStr: string): number {
  if (typeof amountStr !== 'string') {
    throw new TypeError('Expected a string input for amount');
  }

  const trimmed = amountStr.trim();
  if (!MONEY_STRING_REGEX.test(trimmed)) {
    throw new Error(`Invalid money string format: "${amountStr}"`);
  }

  const isNegative = trimmed.startsWith('-');
  const cleanStr = trimmed.replace(/^[+-]/, '');
  const [intPart = '', decPart = ''] = cleanStr.split('.');
  const paddedDecPart = decPart.padEnd(2, '0');
  const combined = (isNegative ? '-' : '') + intPart + paddedDecPart;

  const bigVal = BigInt(combined);
  if (bigVal > BigInt(Number.MAX_SAFE_INTEGER) || bigVal < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`Amount exceeds safe integer range: "${amountStr}"`);
  }

  const result = Number(bigVal);
  assertSafeMinor(result);
  return result;
}

export function formatMinor(minor: number, currency = 'CNY'): string {
  assertSafeMinor(minor);
  const major = minor / 100;
  return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

export function applyBps(minor: number, bps: number): number {
  assertSafeMinor(minor);
  if (!Number.isSafeInteger(bps)) {
    throw new TypeError(`Expected a safe integer for bps, got: ${bps}`);
  }

  const result = new Decimal(minor)
    .times(bps)
    .dividedBy(10000)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  assertSafeMinor(result);
  return result;
}
