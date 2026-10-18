import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { ScenarioStudio } from '@/features/scenarios';
import { GitBranch } from 'lucide-react';

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="What-If Scenarios"
        description="Try out different financial moves to see how they'd affect your cash — without changing anything for real."
      />
      <PageIntro
        storageKey="harbor_intro_scenarios"
        icon={GitBranch}
        title="What can I do here?"
        description="This is your financial sandbox. You can test things like 'What if I take a short-term loan?' or 'What if my biggest customer pays early?' and instantly see how your cash flow would change."
        tips={[
          'Use the quick preset buttons to try common scenarios with one click',
          'The orange line shows your modified scenario vs. the blue baseline',
          "Nothing you do here affects your real data — it's all simulation",
        ]}
      />
      <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Scenario Studio…</div>}>
        <ScenarioStudio />
      </React.Suspense>
    </div>
  );
}
