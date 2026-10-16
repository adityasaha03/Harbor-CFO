import { PageHeader } from '@/components/layout/page-header';
import { AlertsPanel } from '@/features/alerts';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk & Liquidity Alerts"
        description="Active financial risks, liquidity floor breaches, overdue receivables, and concentration warnings."
      />
      <AlertsPanel />
    </div>
  );
}
