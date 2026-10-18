import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { FinancingWorkspace } from '@/features/financing';

export const metadata: Metadata = {
  title: 'Financing Options | HarborCFO',
  description: 'Explore borrowing options to cover cash shortfalls and compare costs.',
};

export default function FinancingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financing Options"
        description="Explore borrowing options if you need extra cash. Compare different loans and credit lines to find the best fit."
      />
      <PageIntro
        storageKey="harbor_intro_financing"
        iconName="landmark"
        title="How does this work?"
        description="If your forecast shows a cash shortfall, this page shows you borrowing options that could help. Each option shows how much it costs, how long the loan is, and how it affects your cash flow."
        tips={[
          'Click "Simulate" on any option to see how it changes your forecast',
          'Lower total cost is generally better — compare the "Total Interest" column',
          'You can request a formal quote once you find an option you like',
        ]}
      />
      <FinancingWorkspace />
    </div>
  );
}
