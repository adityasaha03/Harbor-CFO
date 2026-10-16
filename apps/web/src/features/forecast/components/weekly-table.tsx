'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/data/money';
import { ArrowUpRight } from 'lucide-react';
import type { LatestForecastResponse } from '../api/use-latest-forecast';

export interface WeeklyTableProps {
  forecast: LatestForecastResponse;
  onSelectDate: (date: string) => void;
}

export function WeeklyTable({ forecast, onSelectDate }: WeeklyTableProps) {
  const { weeklyBuckets, floorMinor } = forecast;

  return (
    <Card className="border-border/80 shadow-2xs" data-testid="weekly-forecast-table">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Weekly Aggregated Cash Schedule</CardTitle>
        <CardDescription className="text-xs">
          Accessible 13-week forecast breakdown for keyboard and screen reader accessibility
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-xs font-semibold">Week</TableHead>
                <TableHead className="text-xs font-semibold">Date Range</TableHead>
                <TableHead className="text-right text-xs font-semibold">Receipts</TableHead>
                <TableHead className="text-right text-xs font-semibold">Payments</TableHead>
                <TableHead className="text-right text-xs font-semibold">Min Balance</TableHead>
                <TableHead className="text-right text-xs font-semibold">Closing Balance</TableHead>
                <TableHead className="w-24 text-center text-xs font-semibold">Drill-Down</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyBuckets.map((bucket, index) => {
                const isNegative = bucket.closingMinor < 0;
                const isBelowFloor = bucket.closingMinor < floorMinor;

                return (
                  <TableRow
                    key={bucket.startDate}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`weekly-row-${index + 1}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                      W{index + 1}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <span>{bucket.startDate}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-semibold text-foreground">{bucket.endDate}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <Money minor={bucket.receiptsMinor} className="text-emerald-600 dark:text-emerald-400" />
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <Money minor={bucket.paymentsMinor} className="text-rose-600 dark:text-rose-400" />
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <Money
                        minor={bucket.minMinor}
                        className={bucket.minMinor < 0 ? 'text-destructive font-bold' : undefined}
                      />
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      <Money
                        minor={bucket.closingMinor}
                        className={
                          isNegative
                            ? 'text-destructive font-bold'
                            : isBelowFloor
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-foreground'
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary"
                        onClick={() => onSelectDate(bucket.endDate)}
                        aria-label={`Drill down to week ${index + 1} ending ${bucket.endDate}`}
                      >
                        Details
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
