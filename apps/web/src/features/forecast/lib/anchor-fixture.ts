import {
  type ForecastPoint,
  type WeeklyBucket,
  type FlowSource,
  type ForecastDayDrilldownResponse,
  eachDay,
} from '@harbor/contracts';

export interface AnchorFixtureData {
  asOfDate: string;
  horizonDays: number;
  openingCashMinor: number;
  floorMinor: number;
  points: ForecastPoint[];
  conservativePoints: ForecastPoint[];
  weeklyBuckets: WeeklyBucket[];
  assumptions: string[];
}

export const ANCHOR_AS_OF_DATE = '2026-10-20';
export const ANCHOR_HORIZON_DAYS = 91;
export const ANCHOR_OPENING_CASH_MINOR = 8_000_000; // 80,000 CNY
export const ANCHOR_FLOOR_MINOR = 3_000_000; // 30,000 CNY

export const ANCHOR_ASSUMPTIONS = [
  'Outstanding AR and AP invoices are projected at their expected settlement dates.',
  'Recurring commitments (payroll, rent, overhead) repeat per their defined schedules.',
  'Financing schedules reflect active approved agreements.',
  'Conservative variant delays overdue receivables by 14 days (assumption scenario, not a statistical confidence band).',
  'No unscheduled sales or unconfirmed future revenues are assumed.',
];

interface RawFlow {
  date: string;
  receiptsMinor: number;
  paymentsMinor: number;
  sources: FlowSource[];
}

function getRawFlows(delayLateAr: boolean): Map<string, RawFlow> {
  const flows = new Map<string, RawFlow>();

  const addFlow = (
    date: string,
    type: FlowSource['type'],
    id: string,
    label: string,
    amountMinor: number,
    isReceipt: boolean,
  ) => {
    const existing = flows.get(date) ?? {
      date,
      receiptsMinor: 0,
      paymentsMinor: 0,
      sources: [],
    };

    if (isReceipt) {
      existing.receiptsMinor += amountMinor;
      existing.sources.push({ type, id, label, amountMinor });
    } else {
      existing.paymentsMinor += amountMinor;
      existing.sources.push({ type, id, label, amountMinor: -amountMinor });
    }

    flows.set(date, existing);
  };

  // Day 5 (2026-10-25): Office rent
  addFlow('2026-10-25', 'commitment', 'COMM-RENT', 'Office rent', 1_200_000, false);

  // Day 9 (2026-10-29): Supplier invoice
  addFlow('2026-10-29', 'invoice', 'INV-AP-201', 'Supplier invoice INV-AP-201', 5_500_000, false);

  // Day 12 (2026-11-01): Customer invoice INV-AR-101
  addFlow('2026-11-01', 'invoice', 'INV-AR-101', 'Customer invoice INV-AR-101', 2_000_000, true);

  // Day 14 (2026-11-03): Staff payroll
  addFlow('2026-11-03', 'commitment', 'COMM-PAYROLL', 'Staff payroll', 4_500_000, false);

  // Day 18 (2026-11-07): Quarterly overhead
  addFlow('2026-11-07', 'commitment', 'COMM-OVERHEAD', 'Quarterly overhead', 800_000, false);

  // Weekly recurring retail receipts starting day 22 (2026-11-11)
  const retailDates = [
    '2026-11-11',
    '2026-11-18',
    '2026-11-25',
    '2026-12-02',
    '2026-12-09',
    '2026-12-16',
    '2026-12-23',
    '2026-12-30',
    '2027-01-06',
    '2027-01-13',
  ];
  retailDates.forEach((date) => {
    addFlow(date, 'commitment', 'COMM-RETAIL-RECEIPTS', 'Recurring retail receipts', 1_000_000, true);
  });

  // Late AR invoice: 2026-11-13 normally, delayed 14 days to 2026-11-27 if conservative
  const lateArDate = delayLateAr ? '2026-11-27' : '2026-11-13';
  addFlow(lateArDate, 'invoice', 'INV-AR-LATE', 'Overdue customer receivable INV-AR-LATE', 4_000_000, true);

  // Monthly commitments (Rent: 11-25, 12-25; Payroll: 12-03, 01-03)
  addFlow('2026-11-25', 'commitment', 'COMM-RENT', 'Office rent', 1_200_000, false);
  addFlow('2026-12-03', 'commitment', 'COMM-PAYROLL', 'Staff payroll', 4_500_000, false);
  addFlow('2026-12-25', 'commitment', 'COMM-RENT', 'Office rent', 1_200_000, false);
  addFlow('2027-01-03', 'commitment', 'COMM-PAYROLL', 'Staff payroll', 4_500_000, false);

  return flows;
}

function generatePoints(delayLateAr: boolean): ForecastPoint[] {
  const dates = eachDay(ANCHOR_AS_OF_DATE, ANCHOR_HORIZON_DAYS);
  const flows = getRawFlows(delayLateAr);
  const points: ForecastPoint[] = [];

  let currentCash = ANCHOR_OPENING_CASH_MINOR;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    if (i === 0) {
      points.push({
        date,
        closingMinor: currentCash,
        receiptsMinor: 0,
        paymentsMinor: 0,
        financingMinor: 0,
        feesMinor: 0,
        repaymentsMinor: 0,
        sources: [],
      });
      continue;
    }

    const dayFlow = flows.get(date);
    const receiptsMinor = dayFlow?.receiptsMinor ?? 0;
    const paymentsMinor = dayFlow?.paymentsMinor ?? 0;
    const sources = dayFlow?.sources ?? [];

    currentCash += receiptsMinor - paymentsMinor;

    points.push({
      date,
      closingMinor: currentCash,
      receiptsMinor,
      paymentsMinor,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
      sources,
    });
  }

  return points;
}

function generateWeeklyBuckets(points: ForecastPoint[]): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = [];
  const WEEKS_COUNT = 13;
  const DAYS_PER_WEEK = 7;

  for (let w = 0; w < WEEKS_COUNT; w++) {
    const weekPoints = points.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK);
    const startDate = weekPoints[0]!.date;
    const endDate = weekPoints[weekPoints.length - 1]!.date;
    const closingMinor = weekPoints[weekPoints.length - 1]!.closingMinor;
    const minMinor = Math.min(...weekPoints.map((p) => p.closingMinor));
    const receiptsMinor = weekPoints.reduce((sum, p) => sum + p.receiptsMinor, 0);
    const paymentsMinor = weekPoints.reduce((sum, p) => sum + p.paymentsMinor, 0);

    buckets.push({
      startDate,
      endDate,
      closingMinor,
      minMinor,
      receiptsMinor,
      paymentsMinor,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    });
  }

  return buckets;
}

export function buildAnchorFixture(): AnchorFixtureData {
  const points = generatePoints(false);
  const conservativePoints = generatePoints(true);
  const weeklyBuckets = generateWeeklyBuckets(points);

  return {
    asOfDate: ANCHOR_AS_OF_DATE,
    horizonDays: ANCHOR_HORIZON_DAYS,
    openingCashMinor: ANCHOR_OPENING_CASH_MINOR,
    floorMinor: ANCHOR_FLOOR_MINOR,
    points,
    conservativePoints,
    weeklyBuckets,
    assumptions: ANCHOR_ASSUMPTIONS,
  };
}

export function getAnchorDayDrilldown(date: string): ForecastDayDrilldownResponse {
  const fixture = buildAnchorFixture();
  const point = fixture.points.find((p) => p.date === date);

  if (!point) {
    return {
      date,
      closingMinor: fixture.points[0]?.closingMinor ?? 0,
      receiptsMinor: 0,
      paymentsMinor: 0,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
      sources: [],
      invoices: [],
      commitments: [],
    };
  }

  const invoiceSources = point.sources.filter((s) => s.type === 'invoice');
  const commitmentSources = point.sources.filter((s) => s.type === 'commitment');

  const invoices = invoiceSources.map((s) => ({
    externalId: s.id,
    label: s.label,
    amountMinor: Math.abs(s.amountMinor),
    direction: s.amountMinor > 0 ? 'AR' : 'AP',
    expectedSettlementOn: date,
  }));

  const commitments = commitmentSources.map((s) => ({
    id: s.id,
    label: s.label,
    amountMinor: Math.abs(s.amountMinor),
    direction: s.amountMinor > 0 ? 'inflow' : 'outflow',
    anchorOn: date,
  }));

  return {
    date: point.date,
    closingMinor: point.closingMinor,
    receiptsMinor: point.receiptsMinor,
    paymentsMinor: point.paymentsMinor,
    financingMinor: point.financingMinor,
    feesMinor: point.feesMinor,
    repaymentsMinor: point.repaymentsMinor,
    sources: point.sources,
    invoices,
    commitments,
  };
}
