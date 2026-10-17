'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Compass,
  Copy,
  Check,
  ChevronRight,
  X,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  {
    role: 'Owner',
    email: 'owner@harbor.local',
    badge: 'Full Authority',
    badgeVariant: 'default' as const,
    desc: 'Approves financing, executes sandbox draws, exports cryptographic evidence.',
  },
  {
    role: 'Employee',
    email: 'employee@harbor.local',
    badge: 'Operator',
    badgeVariant: 'secondary' as const,
    desc: 'Uploads bank/invoice CSVs, explores what-if scenarios, chats with AI copilot.',
  },
  {
    role: 'Reviewer',
    email: 'reviewer@harbor.local',
    badge: 'Auditor',
    badgeVariant: 'outline' as const,
    desc: 'Read-only access for competition judges, auditor review, and compliance inspection.',
  },
];

const STORY_STEPS = [
  {
    step: '1. Observe',
    title: 'Import & Ledger Staging',
    desc: 'Synthetic bank transactions & invoices staged with atomic deduplication.',
    href: '/imports',
  },
  {
    step: '2. Diagnose',
    title: 'Day-21 Liquidity Breach',
    desc: 'Cash falls to -¥20,000 on 2026-11-10, breaching the ¥30,000 liquidity floor (gap: ¥50,000).',
    href: '/forecast',
  },
  {
    step: '3. Plan',
    title: 'Remedy Matching & Scenarios',
    desc: 'Compare Bridge Loan vs Revolver vs moving receivables to solve the gap.',
    href: '/financing',
  },
  {
    step: '4. Approve',
    title: 'Owner Sign-Off',
    desc: 'Owner cryptographically approves the structured action proposal with zero hallucination.',
    href: '/actions',
  },
  {
    step: '5. Verify',
    title: 'Tamper-Evident Proof',
    desc: 'Run adversarial invariant checks and download the 9-artifact SHA-256 evidence bundle.',
    href: '/proof',
  },
];

const STORAGE_KEY = 'harbor_demo_guide_dismissed';

export function DemoGuide() {
  const [isDismissed, setIsDismissed] = React.useState(true);
  const [copiedEmail, setCopiedEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setIsDismissed(stored === 'true');
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignored
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
  };

  const handleCopy = (email: string) => {
    void navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success(`Copied "${email}" to clipboard!`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  if (isDismissed) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
          data-testid="show-demo-guide-btn"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span>Show Competition Demo Guide</span>
        </Button>
      </div>
    );
  }

  return (
    <Card
      className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background shadow-sm"
      data-testid="demo-guide-panel"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Competition Demo & Story Guide
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Topic E
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Step-by-step walkthrough of the Harbor Wholesale cash crisis, closed-loop resolution, and 3 test personas.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Dismiss demo guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Story steps horizontal flow */}
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            The Closed-Loop Demo Story
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {STORY_STEPS.map((s) => (
              <Link
                key={s.step}
                href={s.href}
                className="group flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-2.5 transition-all hover:border-primary/60 hover:bg-muted/40"
              >
                <div>
                  <span className="font-mono text-[10px] font-semibold text-primary">
                    {s.step}
                  </span>
                  <p className="font-medium text-foreground text-xs mt-0.5 group-hover:text-primary transition-colors">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                    {s.desc}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-[10px] text-primary/80 group-hover:text-primary font-medium">
                  <span>Open</span>
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 3 Demo Accounts */}
        <div className="border-t border-border/60 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Demo Personas & Credentials
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Sign in via user menu with any password
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{account.role}</span>
                    <Badge variant={account.badgeVariant} className="text-[10px] h-4 px-1.5 font-normal">
                      {account.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {account.desc}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 font-mono text-[11px]">
                  <span className="text-foreground select-all truncate pr-1">{account.email}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleCopy(account.email)}
                    aria-label={`Copy ${account.email}`}
                  >
                    {copiedEmail === account.email ? (
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

