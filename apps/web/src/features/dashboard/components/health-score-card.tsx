'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface HealthScoreData {
  score: number; // 0 - 100
  rating: string;
  summary?: string;
}

/**
 * P1 Feature: Financial Health Score.
 * Hidden when B19 backend endpoint returns 404 or is unavailable.
 */
export function HealthScoreCard() {
  const { data, isError, isLoading } = useQuery<HealthScoreData | null>({
    queryKey: ['analytics', 'health-score'],
    queryFn: async () => {
      try {
        return await apiFetch<HealthScoreData>('/analytics/health');
      } catch {
        // Return null on 404 or error so card remains hidden
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading || isError || !data) {
    return null;
  }

  return (
    <Card className="border-border/80 shadow-xs" data-testid="health-score-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Financial Health Score</CardTitle>
          <CardDescription className="text-xs">
            Composite liquidity and credit risk indicator
          </CardDescription>
        </div>
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
          <Activity className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-foreground">{data.score}</span>
          <span className="text-xs text-muted-foreground">/ 100 ({data.rating})</span>
        </div>
        {data.summary && <p className="text-xs text-muted-foreground">{data.summary}</p>}
      </CardContent>
    </Card>
  );
}
