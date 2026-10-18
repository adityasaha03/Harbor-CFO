import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { AlertsPanel } from '@/features/alerts';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notifications"
        description="Things that need your attention — low cash warnings, overdue invoices, and customer risks."
      />
      <PageIntro
        storageKey="harbor_intro_alerts"
        iconName="alert-triangle"
        title="What are these alerts?"
        description="Alerts are automatic warnings about potential problems in your finances. We monitor your cash flow, overdue invoices, and customer concentration so you don't have to."
        tips={[
          'Critical alerts (red) need immediate action — like running out of cash soon',
          'Warnings (yellow) are things to keep an eye on',
          'You can acknowledge alerts to mark them as seen',
        ]}
      />
      <AlertsPanel />
    </div>
  );
}
