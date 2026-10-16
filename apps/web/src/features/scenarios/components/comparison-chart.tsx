'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatMinor } from '@harbor/contracts';
import type { ScenarioChartPoint } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ComparisonChartProps {
  points: ScenarioChartPoint[];
}

interface ChartItem {
  date: string;
  displayDate: string;
  baselineMajor: number;
  baselineMinor: number;
  scenarioMajor: number;
  scenarioMinor: number;
  deltaMinor: number;
  floorMajor: number;
  floorMinor: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartItem }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) return null;
  const data = payload[0].payload;

  return (
    <div
      className="rounded-lg border border-border/80 bg-background/95 p-3 shadow-md backdrop-blur-xs text-xs space-y-1.5"
      data-testid="comparison-chart-tooltip"
    >
      <p className="font-semibold text-foreground">Date: {data.date}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Baseline:</span>
        <span
          className={`font-mono font-medium ${
            data.baselineMinor < 0 ? 'text-destructive font-bold' : 'text-foreground'
          }`}
        >
          {formatMinor(data.baselineMinor)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-primary font-medium">Scenario:</span>
        <span
          className={`font-mono font-bold ${
            data.scenarioMinor < 0 ? 'text-destructive' : 'text-primary'
          }`}
        >
          {formatMinor(data.scenarioMinor)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
        <span className="text-muted-foreground">Delta:</span>
        <span
          className={`font-mono font-medium ${
            data.deltaMinor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          }`}
        >
          {data.deltaMinor >= 0 ? '+' : ''}
          {formatMinor(data.deltaMinor)}
        </span>
      </div>
    </div>
  );
}

export function ComparisonChart({ points }: ComparisonChartProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData: ChartItem[] = React.useMemo(() => {
    return points.map((p) => ({
      date: p.date,
      displayDate: p.date.slice(5),
      baselineMajor: p.baselineClosingMinor / 100,
      baselineMinor: p.baselineClosingMinor,
      scenarioMajor: p.scenarioClosingMinor / 100,
      scenarioMinor: p.scenarioClosingMinor,
      deltaMinor: p.scenarioClosingMinor - p.baselineClosingMinor,
      floorMajor: p.floorMinor / 100,
      floorMinor: p.floorMinor,
    }));
  }, [points]);

  const floorMajor = points.length > 0 ? points[0]!.floorMinor / 100 : 0;

  if (!isMounted) {
    return (
      <Card data-testid="comparison-chart">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Baseline vs Scenario Cash</CardTitle>
          <CardDescription className="text-xs">
            91-day projected closing cash trajectory comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
          Loading chart…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="comparison-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Baseline vs Scenario Cash</CardTitle>
            <CardDescription className="text-xs">
              Projected closing cash trajectory comparison across the 91-day horizon
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                interval={13}
                tickLine={false}
                stroke="#888888"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(val: number) => `¥${(val / 1000).toFixed(0)}k`}
                tickLine={false}
                stroke="#888888"
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="plainline"
                wrapperStyle={{ fontSize: '12px' }}
              />
              <ReferenceLine
                y={floorMajor}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Floor',
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeDasharray="2 2"
                label={{
                  value: '¥0',
                  position: 'insideBottomRight',
                  fill: '#ef4444',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="baselineMajor"
                name="Baseline Cash"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="scenarioMajor"
                name="Scenario Cash"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
