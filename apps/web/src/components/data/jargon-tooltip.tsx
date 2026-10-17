'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const JARGON_DICTIONARY: Record<string, { title: string; explanation: string }> = {
  'liquidity-floor': {
    title: 'Liquidity Floor',
    explanation:
      'The minimum cash buffer the company must keep to handle emergency payroll, unexpected supplier demands, and maintain creditworthiness.',
  },
  'dso': {
    title: 'Days Sales Outstanding (DSO)',
    explanation:
      'The average number of days it takes to collect payment from customers after issuing an invoice. Lower is faster cash collection.',
  },
  'ar-aging': {
    title: 'Accounts Receivable (AR) Aging',
    explanation:
      'A periodic schedule categorizing unpaid customer invoices by how many days they are past due (0-30, 31-60, 61-90, 90+ days).',
  },
  'customer-concentration': {
    title: 'Customer Concentration',
    explanation:
      'The percentage of total sales or receivables owed by your single largest customer. Over policy limit indicates elevated dependency and default risk.',
  },
  'cash-runway': {
    title: 'Cash Runway',
    explanation:
      'The number of weeks or days your business can continue normal operations before cash reserves drop below zero or breach policy floors.',
  },
  'bridge-loan': {
    title: 'Bridge Loan',
    explanation:
      'A short-term financing facility used to bridge an immediate cash shortfall until expected accounts receivable or funding arrives.',
  },
  'revolver': {
    title: 'Revolving Credit Facility',
    explanation:
      'A flexible borrowing line that allows you to draw down, repay, and redraw capital as needed, paying interest only on the active balance.',
  },
  'fen': {
    title: 'Fen (CNY Minor Units)',
    explanation:
      '1 Yuan = 100 Fen. HarborCFO stores all monetary amounts in integer fen to eliminate floating-point rounding errors in financial ledgers.',
  },
  'action-proposal': {
    title: 'Action Proposal',
    explanation:
      'A machine-audited financial draft. The AI can propose terms, but only a human Owner can authorize cryptographic execution.',
  },
  'burn-rate': {
    title: 'Net Burn Rate',
    explanation:
      'The rate at which the business consumes cash reserves across recurring commitments (payroll, rent, supplier invoices) minus collections.',
  },
};

export interface JargonTooltipProps {
  term: keyof typeof JARGON_DICTIONARY | string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export function JargonTooltip({
  term,
  children,
  showIcon = false,
  className,
}: JargonTooltipProps) {
  const item = JARGON_DICTIONARY[term.toLowerCase()] ?? {
    title: term,
    explanation: 'Financial term explanation',
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/60 transition-colors hover:border-foreground',
              className,
            )}
            tabIndex={0}
            role="button"
            aria-label={`${item.title}: ${item.explanation}`}
          >
            {children || item.title}
            {showIcon && <HelpCircle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs p-2.5 space-y-1 shadow-lg bg-popover text-popover-foreground border border-border">
          <p className="font-semibold text-foreground">{item.title}</p>
          <p className="text-muted-foreground leading-relaxed">{item.explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

