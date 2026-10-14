import { describe, expect, it } from 'vitest';
import {
  addDays,
  assertDateOnly,
  dateOnlySchema,
  diffDays,
  eachDay,
  isDateOnly,
} from '../common/dates';

describe('Date helpers (UTC DateOnly)', () => {
  it('adds days correctly across months matching anchor fixture', () => {
    // Demo anchor: day 0 is 2026-10-20, day 21 is 2026-11-10
    expect(addDays('2026-10-20', 21)).toBe('2026-11-10');
    expect(addDays('2026-10-20', 0)).toBe('2026-10-20');
    expect(addDays('2026-11-10', -21)).toBe('2026-10-20');
  });

  it('handles month-end transitions correctly', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles leap-year cases accurately', () => {
    // 2024 is a leap year
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');

    // 2023 is not a leap year
    expect(isDateOnly('2023-02-29')).toBe(false);

    // 2000 is a leap year (divisible by 400)
    expect(isDateOnly('2000-02-29')).toBe(true);

    // 1900 is not a leap year (divisible by 100 but not 400)
    expect(isDateOnly('1900-02-29')).toBe(false);
  });

  it('rejects invalid calendar dates and bad formats', () => {
    // Impossible days for given months
    expect(isDateOnly('2026-02-29')).toBe(false);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('2026-04-31')).toBe(false);
    expect(isDateOnly('2026-06-31')).toBe(false);
    expect(isDateOnly('2026-09-31')).toBe(false);
    expect(isDateOnly('2026-11-31')).toBe(false);

    // Impossible month/day numbers
    expect(isDateOnly('2026-00-15')).toBe(false);
    expect(isDateOnly('2026-13-01')).toBe(false);
    expect(isDateOnly('2026-10-00')).toBe(false);
    expect(isDateOnly('2026-10-32')).toBe(false);

    // Bad formats
    expect(isDateOnly('2026/10/20')).toBe(false);
    expect(isDateOnly('20-10-2026')).toBe(false);
    expect(isDateOnly('2026-10-20T00:00:00Z')).toBe(false);
    expect(isDateOnly('abc')).toBe(false);
    expect(isDateOnly('')).toBe(false);
    expect(isDateOnly(null)).toBe(false);
    expect(isDateOnly(undefined)).toBe(false);
    expect(isDateOnly(12345)).toBe(false);

    // assertDateOnly throws
    expect(() => assertDateOnly('2026-02-29')).toThrow(/Invalid DateOnly/);

    // dateOnlySchema throws
    expect(() => dateOnlySchema.parse('2026-02-29')).toThrow();
    expect(dateOnlySchema.parse('2026-10-20')).toBe('2026-10-20');
  });

  it('computes diffDays correctly', () => {
    expect(diffDays('2026-11-10', '2026-10-20')).toBe(21);
    expect(diffDays('2026-10-20', '2026-11-10')).toBe(-21);
    expect(diffDays('2026-10-20', '2026-10-20')).toBe(0);

    // Year boundary diff
    expect(diffDays('2027-01-05', '2026-12-25')).toBe(11);
  });

  it('generates a range of consecutive dates with eachDay', () => {
    expect(eachDay('2026-10-20', 3)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);
    expect(eachDay('2026-10-20', 0)).toEqual([]);
    expect(eachDay('2026-10-30', 4)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);

    expect(() => eachDay('2026-10-20', -1)).toThrow(/Expected a non-negative safe integer/);
  });
});
