import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { ActionsWorkspace } from '@/features/actions';
import { ShieldCheck } from 'lucide-react';

export default function ActionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review & Approve Actions"
        description="Review financial proposals and give your approval before anything gets executed. You're always in control."
      />
      <PageIntro
        storageKey="harbor_intro_actions"
        icon={ShieldCheck}
        title="Why do I need to approve things?"
        description="For your safety, no financial action (like taking a loan) happens automatically. The system creates a proposal, shows you exactly what will happen, and waits for your explicit approval."
        tips={[
          'Only the business Owner can approve proposals',
          'Each proposal shows the exact impact on your cash flow before you approve',
          'Proposals expire if not reviewed — check the countdown timer',
        ]}
      />
      <React.Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading action proposals…</div>}>
        <ActionsWorkspace />
      </React.Suspense>
    </div>
  );
}
