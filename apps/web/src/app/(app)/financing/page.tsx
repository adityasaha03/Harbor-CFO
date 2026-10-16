import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { FinancingWorkspace } from '@/features/financing';

export const metadata: Metadata = {
  title: 'Financing Options | HarborCFO',
  description:
    'Simulate, evaluate, and rank working capital financing facilities against live cash forecasts.',
};

export default function FinancingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financing Options"
        description="Ranked simulated financing offers, total borrowing costs, and explainable eligibility."
      />
      <FinancingWorkspace />
    </div>
  );
}
