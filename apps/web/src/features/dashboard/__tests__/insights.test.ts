import { describe, it, expect } from 'vitest';
import { generateDeterministicInsights } from '../components/insights-list';
import { ANCHOR_FORECAST_MOCK } from '@/features/forecast';
import { ANCHOR_ANALYTICS_MOCK } from '@/features/analytics';

describe('generateDeterministicInsights', () => {
  it('generates 3 accurate deterministic insights for the anchor breach scenario', () => {
    const insights = generateDeterministicInsights(
      ANCHOR_FORECAST_MOCK,
      ANCHOR_ANALYTICS_MOCK,
    );

    expect(insights).toHaveLength(3);

    // 1. Liquidity breach
    const liquidity = insights.find((i) => i.category === 'liquidity')!;
    expect(liquidity).toBeDefined();
    expect(liquidity.standardText).toContain('Cash first falls below the floor on 29 Oct.');
    expect(liquidity.plainText).toContain('We will run short of cash on 29 Oct.');
    expect(liquidity.plainText).toContain('50,000.00');

    // 2. Customer concentration
    const concentration = insights.find((i) => i.category === 'concentration')!;
    expect(concentration).toBeDefined();
    expect(concentration.standardText).toContain('Apex Distribution Ltd');
    expect(concentration.standardText).toContain('66.7%');
    expect(concentration.standardText).toContain('exceeds 40.0% threshold');
    expect(concentration.plainText).toContain('Too much money is owed by one customer');

    // 3. Overdue receivables
    const overdue = insights.find((i) => i.category === 'overdue')!;
    expect(overdue).toBeDefined();
    expect(overdue.standardText).toContain('40,000.00');
    expect(overdue.standardText).toContain('overdue in the 1–30 day bucket');
    expect(overdue.plainText).toContain('late');
  });

  it('generates positive affirmations when in healthy no-breach state', () => {
    const healthyForecast = {
      ...ANCHOR_FORECAST_MOCK,
      summary: {
        minCashMinor: 4500000,
        minCashDate: '2026-11-20',
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        liquidityGapMinor: 0,
      },
    };

    const healthyAnalytics = {
      ...ANCHOR_ANALYTICS_MOCK,
      concentration: {
        topCustomerExternalId: 'CUST-BEACON',
        topCustomerName: 'Beacon Partners',
        topCustomerArMinor: 1500000,
        totalArMinor: 6000000,
        shareBps: 2500, // 25.0%
        thresholdBps: 4000,
        isExceeded: false,
      },
      arAging: {
        currentMinor: 6000000,
        days1to30Minor: 0,
        days31to60Minor: 0,
        days61to90Minor: 0,
        daysOver90Minor: 0,
        totalMinor: 6000000,
      },
    };

    const insights = generateDeterministicInsights(healthyForecast, healthyAnalytics);
    expect(insights).toHaveLength(3);

    const liquidity = insights.find((i) => i.category === 'liquidity')!;
    expect(liquidity.standardText).toBe(
      'Projected cash remains above the liquidity floor throughout the 91-day horizon.',
    );
    expect(liquidity.plainText).toBe(
      'Good news! We have enough cash to stay safe for the next 3 months.',
    );

    const concentration = insights.find((i) => i.category === 'concentration')!;
    expect(concentration.standardText).toContain('Customer concentration is healthy');
    expect(concentration.plainText).toContain('Our customers are well diversified');

    const overdue = insights.find((i) => i.category === 'overdue')!;
    expect(overdue.standardText).toContain('All outstanding receivables are current');
    expect(overdue.plainText).toBe('All customers are paying on time right now.');
  });
});
