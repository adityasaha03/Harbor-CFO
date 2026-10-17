'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatMinor } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleChartSummary } from '@/components/data';
import type { LatestForecastResponse } from '@/features/forecast';

export interface CashCurveChartProps {
  forecast: LatestForecastResponse;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: {
      date: string;
      startDate: string;
      closingMinor: number;
      floorMinor: number;
    };
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/80 bg-background/95 p-3 shadow-md backdrop-blur-xs text-xs space-y-1.5">
      <p className="font-semibold text-foreground">Week Ending: {data.date}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Closing Cash:</span>
        <span
          className={`font-mono font-medium ${
            data.closingMinor < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
          }`}
        >
          {formatMinor(data.closingMinor)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Liquidity Floor:</span>
        <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
          {formatMinor(data.floorMinor)}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">
        Click point to drill down
      </p>
    </div>
  );
}

export function CashCurveChart({ forecast }: CashCurveChartProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { weeklyBuckets, floorMinor } = forecast;

  const chartData = React.useMemo(() => {
    return weeklyBuckets.map((bucket) => ({
      date: bucket.endDate,
      startDate: bucket.startDate,
      displayDate: bucket.endDate.slice(5), // 'MM-DD'
      closingMajor: bucket.closingMinor / 100,
      closingMinor: bucket.closingMinor,
      floorMajor: floorMinor / 100,
      floorMinor: floorMinor,
    }));
  }, [weeklyBuckets, floorMinor]);

  const handlePointClick = (data: { date: string }) => {
    if (data?.date) {
      router.push(`/forecast?date=${encodeURIComponent(data.date)}`);
    }
  };

  return (
    <Card className="border-border/80 shadow-xs" data-testid="cash-curve-chart">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
        <div>
          <CardTitle className="text-base font-semibold">13-Week Cash Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Deterministic weekly closing balances vs liquidity policy floor
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-muted-foreground">Closing Cash</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-b-2 border-dashed border-amber-500" />
            <span className="text-muted-foreground">Floor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-muted-foreground/60" />
            <span className="text-muted-foreground">Zero</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div
          className="h-72 w-full"
          role="region"
          aria-label="13-Week Cash Trajectory Line Chart"
          data-testid="cash-trajectory-region"
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 24, left: 16, bottom: 8 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const point = e.activePayload[0].payload as { date: string };
                    handlePointClick(point);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val: number) => `¥${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  label={{ value: '¥0', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <ReferenceLine
                  y={floorMinor / 100}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Floor', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="closingMajor"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0, cursor: 'pointer' }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2, cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Loading chart...
            </div>
          )}
        </div>

        {/* Accessible narrative summary and weekly data table alternative */}
        <AccessibleChartSummary
          weeklyBuckets={weeklyBuckets}
          floorMinor={floorMinor}
          chartTitle="13-Week Cash Trajectory"
        />
      </CardContent>
    </Card>
  );
}
