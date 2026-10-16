import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ScenarioStudio } from '@/features/scenarios';

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Studio"
        description="Model non-committing what-if cash modifications, simulate liquidity remedies, and analyze trade-offs."
      />
      <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Scenario Studio…</div>}>
        <ScenarioStudio />
      </React.Suspense>
    </div>
  );
}
