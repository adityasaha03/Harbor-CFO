'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  FileText,
  DollarSign,
  Compass,
  Landmark,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EvidenceChipsProps {
  evidenceRefs: string[];
  className?: string;
}

interface EvidenceMeta {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function resolveEvidenceMeta(ref: string): EvidenceMeta {
  const parts = ref.split(':');
  const type = parts[0]?.toLowerCase();
  const id = parts.slice(1).join(':') || ref;

  switch (type) {
    case 'forecast':
      return {
        href: '/forecast',
        label: `Forecast ${id}`,
        icon: TrendingUp,
      };
    case 'invoice':
      return {
        href: '/imports',
        label: `Invoice ${id}`,
        icon: FileText,
      };
    case 'offer':
      return {
        href: '/financing',
        label: `Financing Offer ${id}`,
        icon: DollarSign,
      };
    case 'scenario':
      return {
        href: '/scenarios',
        label: `Scenario ${id}`,
        icon: Compass,
      };
    case 'account':
      return {
        href: '/dashboard',
        label: `Account ${id}`,
        icon: Landmark,
      };
    case 'action':
    case 'proposal':
      return {
        href: '/actions',
        label: `Proposal ${id}`,
        icon: ShieldCheck,
      };
    default:
      return {
        href: '/dashboard',
        label: ref,
        icon: ExternalLink,
      };
  }
}

/**
 * Renders clickable evidence chips referencing underlying financial models,
 * invoices, financing offers, and scenarios used to ground the copilot's answers.
 */
export function EvidenceChips({ evidenceRefs, className }: EvidenceChipsProps) {
  if (!evidenceRefs || evidenceRefs.length === 0) {
    return null;
  }

  // Deduplicate refs
  const uniqueRefs = Array.from(new Set(evidenceRefs));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">
        Grounding Evidence ({uniqueRefs.length}):
      </span>
      <div className="flex flex-wrap gap-1.5">
        {uniqueRefs.map((ref) => {
          const meta = resolveEvidenceMeta(ref);
          const Icon = meta.icon;

          return (
            <Link key={ref} href={meta.href} passHref>
              <Badge
                variant="outline"
                className="cursor-pointer gap-1.5 py-1 px-2.5 text-xs font-normal bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                title={`View ${ref}`}
              >
                <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>{meta.label}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
              </Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
