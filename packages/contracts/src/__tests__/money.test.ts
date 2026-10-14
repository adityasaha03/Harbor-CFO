import { describe, expect, it } from 'vitest';
import { applyBps, assertSafeMinor, formatMinor, minorSchema, toMinor } from '../common/money';

describe('Money helpers and minor units', () => {
  it('converts decimal string to minor fen integer correctly', () => {
    expect(toMinor('12500.00')).toBe(1250000);
    expect(toMinor('12500')).toBe(1250000);
    expect(toMinor('12500.5')).toBe(1250050);
    expect(toMinor('0.05')).toBe(5);
    expect(toMinor('0.00')).toBe(0);
    expect(toMinor('0')).toBe(0);
    expect(toMinor('-20000.00')).toBe(-2000000);
    expect(toMinor('-0.50')).toBe(-50);
  });

  it('rejects invalid, malformed, or precision-overflowing money strings', () => {
    // Rejects more than 2 decimal places
    expect(() => toMinor('1.234')).toThrow(/Invalid money string format/);
    expect(() => toMinor('0.001')).toThrow(/Invalid money string format/);

    // Rejects non-numeric strings
    expect(() => toMinor('abc')).toThrow(/Invalid money string format/);
    expect(() => toMinor('')).toThrow(/Invalid money string format/);
    expect(() => toMinor('   ')).toThrow(/Invalid money string format/);
    expect(() => toMinor('12.34.56')).toThrow(/Invalid money string format/);
    expect(() => toMinor('12,500.00')).toThrow(/Invalid money string format/);
    expect(() => toMinor('$12500')).toThrow(/Invalid money string format/);

    // Rejects unsafe integers
    expect(() => toMinor('9007199254740993')).toThrow(/Amount exceeds safe integer range/);
    expect(() => toMinor('90071992547409.92')).toThrow(/Amount exceeds safe integer range/);
  });

  it('calculates basis points with rounding half-up using applyBps', () => {
    // 6,000,000 fen (60,000 CNY) at 200 bps (2%) = 120,000 fen (1,200 CNY)
    expect(applyBps(6000000, 200)).toBe(120000);

    // Rounding half up: 100 * 50 / 10000 = 0.5 -> 1
    expect(applyBps(100, 50)).toBe(1);

    // Rounding half down check: 100 * 49 / 10000 = 0.49 -> 0
    expect(applyBps(100, 49)).toBe(0);

    // Negative amounts
    expect(applyBps(-6000000, 200)).toBe(-120000);

    // Zero
    expect(applyBps(0, 500)).toBe(0);
    expect(applyBps(50000, 0)).toBe(0);

    // Rejects unsafe integer inputs
    expect(() => applyBps(1.5, 100)).toThrow(/Expected a safe integer/);
    expect(() => applyBps(1000, 1.5)).toThrow(/Expected a safe integer/);
  });

  it('formats minor amounts for display', () => {
    const formattedCNY = formatMinor(1250000, 'CNY');
    expect(formattedCNY).toContain('12,500.00');

    const formattedZero = formatMinor(0, 'CNY');
    expect(formattedZero).toContain('0.00');

    const formattedNegative = formatMinor(-2000000, 'CNY');
    expect(formattedNegative).toContain('20,000.00');
  });

  it('assertSafeMinor validates safe integer bounds', () => {
    expect(() => assertSafeMinor(100)).not.toThrow();
    expect(() => assertSafeMinor(0)).not.toThrow();
    expect(() => assertSafeMinor(-100)).not.toThrow();
    expect(() => assertSafeMinor(Number.MAX_SAFE_INTEGER)).not.toThrow();
    expect(() => assertSafeMinor(Number.MIN_SAFE_INTEGER)).not.toThrow();

    expect(() => assertSafeMinor(12.34)).toThrow(/Expected a safe integer/);
    expect(() => assertSafeMinor(Number.MAX_SAFE_INTEGER + 1)).toThrow(/Expected a safe integer/);
    expect(() => assertSafeMinor(NaN)).toThrow(/Expected a safe integer/);
    expect(() => assertSafeMinor(Infinity)).toThrow(/Expected a safe integer/);
  });

  it('minorSchema validates safe integers', () => {
    expect(minorSchema.parse(1250000)).toBe(1250000);
    expect(minorSchema.parse(-20000)).toBe(-20000);
    expect(() => minorSchema.parse(12.5)).toThrow();
    expect(() => minorSchema.parse('1250000')).toThrow();
  });
});
