import * as React from 'react';
import Link from 'next/link';
import type { AlertEvidenceItem } from '@harbor/contracts';
import { Money } from '@/components/data/money';
import { Calendar, FileText, Building2, ArrowUpRight, HelpCircle } from 'lucide-react';

export interface AlertEvidenceListProps {
  evidence: AlertEvidenceItem[];
  ruleId?: string;
}

export function AlertEvidenceList({ evidence, ruleId }: AlertEvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5 pt-2" data-testid="alert-evidence-list">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Supporting Evidence
      </div>
      <div className="grid gap-2">
        {evidence.map((item, idx) => (
          <EvidenceItemRow key={`${item.type}-${item.id}-${idx}`} item={item} ruleId={ruleId} />
        ))}
      </div>
    </div>
  );
}

function EvidenceItemRow({ item, ruleId }: { item: AlertEvidenceItem; ruleId?: string }) {
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(item.id);
  // Match dates within label if id is not directly a date string (e.g. "Projected negative closing balance on 2026-11-10")
  const dateMatch = item.id.match(/\d{4}-\d{2}-\d{2}/) || item.label.match(/\d{4}-\d{2}-\d{2}/);
  const targetDate = isDate ? item.id : dateMatch ? dateMatch[0] : null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md bg-muted/40 border border-border/60 text-xs"
      data-testid={`evidence-item-${item.type}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <EvidenceIcon type={item.type} />
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate max-w-sm" title={item.label}>
            {item.label}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {item.type.toUpperCase()}: {item.id}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {typeof item.amountMinor === 'number' && (
          <div className="font-mono text-xs">
            <Money minor={item.amountMinor} />
          </div>
        )}

        {/* Forecast deep link to single-day drilldown */}
        {(item.type === 'forecast' || ruleId === 'negative_cash' || ruleId === 'floor_breach') && targetDate && (
          <Link
            href={`/forecast?date=${encodeURIComponent(targetDate)}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            data-testid="evidence-forecast-link"
          >
            <span>See why</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function EvidenceIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case 'forecast':
      return <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case 'invoice':
      return <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case 'counterparty':
      return <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    default:
      return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}
