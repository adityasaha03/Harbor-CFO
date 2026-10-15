import { describe, it, expect } from 'vitest';
import { expandCommitment } from '../expand-commitments';

describe('expandCommitment', () => {
  const asOfDate = '2026-10-20';
  const horizonDays = 91;

  it('expands once frequency occurring after asOfDate', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-1',
        label: 'One-off fee',
        direction: 'outflow',
        amountMinor: 50_000,
        frequency: 'once',
        anchorOn: '2026-10-25',
      },
      asOfDate,
      horizonDays,
    );

    expect(flows).toHaveLength(1);
    expect(flows[0]!.date).toBe('2026-10-25');
    expect(flows[0]!.amountMinor).toBe(-50_000);
    expect(flows[0]!.dayIndex).toBe(5);
  });

  it('ignores once frequency occurring before or on asOfDate', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-1',
        label: 'Past one-off fee',
        direction: 'outflow',
        amountMinor: 50_000,
        frequency: 'once',
        anchorOn: '2026-10-20',
      },
      asOfDate,
      horizonDays,
    );

    expect(flows).toHaveLength(0);
  });

  it('expands weekly commitment every 7 days', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-WEEKLY',
        label: 'Weekly inflow',
        direction: 'inflow',
        amountMinor: 10_000,
        frequency: 'weekly',
        anchorOn: '2026-10-21',
      },
      asOfDate,
      28, // 4 weeks
    );

    expect(flows.length).toBe(4);
    expect(flows[0]!.date).toBe('2026-10-21');
    expect(flows[1]!.date).toBe('2026-10-28');
    expect(flows[2]!.date).toBe('2026-11-04');
    expect(flows[3]!.date).toBe('2026-11-11');
    expect(flows.every((f) => f.amountMinor === 10_000)).toBe(true);
  });

  it('expands biweekly commitment every 14 days', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-BIWEEKLY',
        label: 'Biweekly payroll',
        direction: 'outflow',
        amountMinor: 20_000,
        frequency: 'biweekly',
        anchorOn: '2026-10-25',
      },
      asOfDate,
      40,
    );

    expect(flows.length).toBe(3);
    expect(flows[0]!.date).toBe('2026-10-25');
    expect(flows[1]!.date).toBe('2026-11-08');
    expect(flows[2]!.date).toBe('2026-11-22');
  });

  it('stops generating occurrences after endOn', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-LIMITED',
        label: 'Limited subscription',
        direction: 'outflow',
        amountMinor: 5_000,
        frequency: 'weekly',
        anchorOn: '2026-10-21',
        endOn: '2026-11-01',
      },
      asOfDate,
      91,
    );

    expect(flows.length).toBe(2);
    expect(flows[0]!.date).toBe('2026-10-21');
    expect(flows[1]!.date).toBe('2026-10-28');
  });

  it('advances past anchorOn when anchorOn is in the past', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-OLD',
        label: 'Established weekly',
        direction: 'inflow',
        amountMinor: 5_000,
        frequency: 'weekly',
        anchorOn: '2026-09-01',
      },
      asOfDate, // 2026-10-20
      14,
    );

    expect(flows.length).toBeGreaterThan(0);
    // All occurrences must be strictly after asOfDate
    expect(flows.every((f) => f.dayIndex >= 1)).toBe(true);
  });

  it('clamps monthly commitment on 31st to 28/30 days in shorter months', () => {
    const flows = expandCommitment(
      {
        id: 'COMM-MONTHLY-31',
        label: 'Month-end salary',
        direction: 'outflow',
        amountMinor: 100_000,
        frequency: 'monthly',
        anchorOn: '2026-01-31',
      },
      '2026-01-01',
      120, // Jan through April
    );

    const dates = flows.map((f) => f.date);
    expect(dates).toContain('2026-01-31');
    expect(dates).toContain('2026-02-28'); // Non-leap year clamp
    expect(dates).toContain('2026-03-31');
    expect(dates).toContain('2026-04-30'); // 30-day month clamp
  });
});

