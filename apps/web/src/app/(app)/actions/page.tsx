import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ActionsWorkspace } from '@/features/actions';

export default function ActionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Approval Flow"
        description="Owner approval and cryptographic execution of simulated financing remedies."
      />
      <React.Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading action proposals…</div>}>
        <ActionsWorkspace />
      </React.Suspense>
    </div>
  );
}
