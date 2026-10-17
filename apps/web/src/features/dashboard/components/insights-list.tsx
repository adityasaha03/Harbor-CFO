'use client';

import * as React from 'react';
import { Lightbulb, Sparkles, BookOpen } from 'lucide-react';
import { formatMinor } from '@harbor/contracts';
import type { LatestForecastResponse } from '@/features/forecast';
import type { AnalyticsSummary } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface InsightsListProps {
  forecast: LatestForecastResponse;
  analytics: AnalyticsSummary;
}

export interface DeterministicInsight {
  id: string;
  category: 'liquidity' | 'concentration' | 'overdue';
  standardText: string;
  plainText: string;
}

function formatShortDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Deterministically generates exactly three client-side finance insights
 * based strictly on validated forecast and analytics models. No LLM generation.
 */
export function generateDeterministicInsights(
  forecast: LatestForecastResponse,
  analytics: AnalyticsSummary,
): DeterministicInsight[] {
  const { summary, floorMinor } = forecast;
  const { concentration, arAging } = analytics;

  // 1. Liquidity breach insight
  const isBreached = summary.liquidityGapMinor > 0 || summary.minCashMinor < floorMinor;
  let liquidityInsight: DeterministicInsight;

  if (isBreached && summary.firstBelowFloorDate) {
    const breachDay = formatShortDate(summary.firstBelowFloorDate);
    liquidityInsight = {
      id: 'insight_liquidity_breach',
      category: 'liquidity',
      standardText: `Cash first falls below the floor on ${breachDay}.`,
      plainText: `We will run short of cash on ${breachDay}. We need ${formatMinor(
        summary.liquidityGapMinor,
      )} to stay safe.`,
    };
  } else {
    liquidityInsight = {
      id: 'insight_liquidity_ok',
      category: 'liquidity',
      standardText: 'Projected cash remains above the liquidity floor throughout the 91-day horizon.',
      plainText: 'Good news! We have enough cash to stay safe for the next 3 months.',
    };
  }

  // 2. Customer concentration insight
  const sharePercent = (concentration.shareBps / 100).toFixed(1);
  const thresholdPercent = (concentration.thresholdBps ? concentration.thresholdBps / 100 : 40).toFixed(1);
  const thresholdFormatted = (concentration.thresholdBps ? concentration.thresholdBps / 100 : 40).toString();
  let concentrationInsight: DeterministicInsight;

  if (concentration.isExceeded) {
    concentrationInsight = {
      id: 'insight_concentration_high',
      category: 'concentration',
      standardText: `${concentration.topCustomerName} represents ${sharePercent}% of receivables (exceeds ${thresholdPercent}% threshold).`,
      plainText: `Too much money is owed by one customer: ${concentration.topCustomerName} owes ${sharePercent}% of our unpaid invoices.`,
    };
  } else {
    concentrationInsight = {
      id: 'insight_concentration_ok',
      category: 'concentration',
      standardText: `Customer concentration is healthy; largest customer accounts for ${sharePercent}% of receivables.`,
      plainText: `Our customers are well diversified. No single customer owes more than ${thresholdFormatted}% of our invoices.`,
    };
  }

  // 3. Receivables aging / overdue insight
  const overdueTotalMinor = arAging.totalMinor - arAging.currentMinor;
  let overdueInsight: DeterministicInsight;

  if (overdueTotalMinor > 0) {
    overdueInsight = {
      id: 'insight_overdue_warning',
      category: 'overdue',
      standardText: `${formatMinor(arAging.days1to30Minor)} is overdue in the 1–30 day bucket.`,
      plainText: `${formatMinor(arAging.days1to30Minor)} is late. We should chase these overdue payments right away.`,
    };
  } else {
    overdueInsight = {
      id: 'insight_overdue_ok',
      category: 'overdue',
      standardText: 'All outstanding receivables are current and within contractual payment terms.',
      plainText: 'All customers are paying on time right now.',
    };
  }

  return [liquidityInsight, concentrationInsight, overdueInsight];
}

export function InsightsList({ forecast, analytics }: InsightsListProps) {
  const [plainLanguage, setPlainLanguage] = React.useState(false);

  const insights = React.useMemo(() => {
    return generateDeterministicInsights(forecast, analytics);
  }, [forecast, analytics]);

  return (
    <Card className="border-border/80 shadow-xs" data-testid="insights-list">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Key Takeaways & Actions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Deterministic rule-based conclusions derived directly from current ledger state
          </CardDescription>
        </div>

        {/* P1 plain-language toggle */}
        <Button
          type="button"
          size="sm"
          variant={plainLanguage ? 'secondary' : 'outline'}
          onClick={() => setPlainLanguage(!plainLanguage)}
          className="text-xs h-7 gap-1.5 self-start sm:self-auto"
        >
          {plainLanguage ? (
            <>
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Plain Language: On</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Plain Language: Off</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {insights.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-md bg-muted/40 p-2.5 border border-border/60 text-xs"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary font-mono mt-0.5">
                {idx + 1}
              </span>
              <p className="text-foreground leading-relaxed">
                {plainLanguage ? item.plainText : item.standardText}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
