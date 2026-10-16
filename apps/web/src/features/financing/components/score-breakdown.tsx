'use client';

import type { FinancingScoringBreakdown } from '@harbor/contracts';

interface ScoreBreakdownProps {
  breakdown: FinancingScoringBreakdown;
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const factors = [
    {
      label: 'Gap Coverage',
      weight: '35%',
      value: breakdown.gapCoverage,
      color: 'bg-blue-500',
    },
    {
      label: 'Timeliness',
      weight: '25%',
      value: breakdown.timeliness,
      color: 'bg-emerald-500',
    },
    {
      label: 'Repayment Resilience',
      weight: '25%',
      value: breakdown.repaymentResilience,
      color: 'bg-purple-500',
    },
    {
      label: 'Cost Efficiency',
      weight: '15%',
      value: breakdown.costEfficiency,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-2.5 p-3 rounded-lg bg-muted/40 border border-border/60">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground tracking-tight">
          Explainable Ranking Score
        </span>
        <span className="font-mono font-bold text-primary text-sm">
          {(breakdown.totalScore * 100).toFixed(1)} / 100
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-border/40">
        {factors.map((f) => {
          const pct = Math.round(f.value * 100);
          return (
            <div key={f.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">
                  {f.label}{' '}
                  <span className="text-[10px] text-muted-foreground/60">
                    ({f.weight})
                  </span>
                </span>
                <span className="font-mono font-medium text-foreground ml-1">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.color} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
