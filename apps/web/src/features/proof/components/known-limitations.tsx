'use client';

import * as React from 'react';
import { AlertTriangle, Database, Building2, Key, Radio, Cpu, Sparkles, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LimitationItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag: string;
  description: string;
}

const LIMITATIONS: LimitationItem[] = [
  {
    icon: Database,
    title: 'Synthetic Demo Data Only',
    tag: 'Data Hygiene',
    description:
      'All counterparty accounts, ledger entries, invoices, and credit lines are synthetic fixtures created for competition evaluation. No real personal or corporate financial data is stored.',
  },
  {
    icon: Building2,
    title: 'No Direct Bank / Clearinghouse Integration',
    tag: 'Simulated Sandbox',
    description:
      'Cash draws, invoice factoring, and collections occur within an isolated database sandbox. In a production deployment, this layer connects to banking open APIs and ERP gateways.',
  },
  {
    icon: Lock,
    title: 'Email Verification & MFA Omitted',
    tag: 'Demo Usability',
    description:
      'To facilitate seamless judge evaluation without external SMTP dependencies, email verification and hardware MFA challenges are disabled for the pre-seeded demo accounts.',
  },
  {
    icon: Radio,
    title: 'Single-Instance In-Process Event Bus',
    tag: 'Telemetry Architecture',
    description:
      'Live SSE streaming uses a local Node.js EventEmitter rather than a distributed message queue (e.g. Redis / RabbitMQ), designed for the single API instance demonstration architecture.',
  },
  {
    icon: Key,
    title: 'Environment-Held Secret Keys',
    tag: 'Key Management',
    description:
      'Cryptographic tokens and LLM API keys are loaded via process environment variables rather than dedicated Hardware Security Modules (HSM) or cloud KMS infrastructure.',
  },
  {
    icon: Sparkles,
    title: 'Decision Support, Not Legal Underwriting',
    tag: 'Financing Catalog',
    description:
      'Financing eligibility, cost schedules, and rankings provide transparent algorithmic decision support. They do not constitute binding credit commitments or bank loan underwriting.',
  },
  {
    icon: Cpu,
    title: 'Replay Mode Labeled vs Live Inference',
    tag: 'LLM Runtime',
    description:
      'When configured in deterministic replay mode, the copilot streams genuine past tool traces to guarantee reproducible reviews without depending on external AI provider latency.',
  },
];

export function KnownLimitations(): React.JSX.Element {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg font-bold tracking-tight">
            System Boundaries & Known Limitations
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          Transparent technical disclosure of competition sandbox constraints and architecture invariants.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {LIMITATIONS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/60 p-3.5 transition-all hover:border-border hover:bg-muted/10"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
