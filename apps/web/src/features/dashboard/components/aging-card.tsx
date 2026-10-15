'use client';

import * as React from 'react';
import type { AgingBucket, AnalyticsSummary } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Money } from '@/components/data/money';
import { SourceChip } from './source-chip';

export interface AgingCardProps {
  analytics: AnalyticsSummary;
}

interface BucketRowProps {
  label: string;
  minor: number;
  totalMinor: number;
  highlight?: boolean;
}

function BucketRow({ label, minor, totalMinor, highlight }: BucketRowProps) {
  const percentage = totalMinor > 0 ? ((minor / totalMinor) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${highlight && minor > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground font-mono text-[11px] w-12 text-right">
          {percentage}%
        </span>
        <span className={`font-mono font-medium ${highlight && minor > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
          <Money minor={minor} />
        </span>
      </div>
    </div>
  );
}

function BucketTable({ bucket, title }: { bucket: AgingBucket; title: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="text-xs font-bold font-mono">
          Total: <Money minor={bucket.totalMinor} />
        </div>
      </div>
      <div className="space-y-0.5">
        <BucketRow label="Current (Not Due)" minor={bucket.currentMinor} totalMinor={bucket.totalMinor} />
        <BucketRow label="1 – 30 Days Past Due" minor={bucket.days1to30Minor} totalMinor={bucket.totalMinor} highlight />
        <BucketRow label="31 – 60 Days Past Due" minor={bucket.days31to60Minor} totalMinor={bucket.totalMinor} highlight />
        <BucketRow label="61 – 90 Days Past Due" minor={bucket.days61to90Minor} totalMinor={bucket.totalMinor} highlight />
        <BucketRow label="> 90 Days Past Due" minor={bucket.daysOver90Minor} totalMinor={bucket.totalMinor} highlight />
      </div>
    </div>
  );
}

export function AgingCard({ analytics }: AgingCardProps) {
  const { arAging, apAging } = analytics;

  return (
    <Card className="border-border/80 shadow-xs" data-testid="aging-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Invoice Aging Schedule</CardTitle>
          <CardDescription className="text-xs">
            Outstanding balances partitioned into 30-day buckets
          </CardDescription>
        </div>
        <SourceChip formulaKey="aging" />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="ar" className="text-xs">
              Receivables (AR)
            </TabsTrigger>
            <TabsTrigger value="ap" className="text-xs">
              Payables (AP)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ar">
            <BucketTable bucket={arAging} title="Accounts Receivable" />
          </TabsContent>
          <TabsContent value="ap">
            <BucketTable bucket={apAging} title="Accounts Payable" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
