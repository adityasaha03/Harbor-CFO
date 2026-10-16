import { PageHeader } from '@/components/layout/page-header';
import { SettingsTabs } from '@/features/settings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Team"
        description="Configure liquidity floor targets, business parameters, recurring commitments, and team member roles."
      />
      <SettingsTabs />
    </div>
  );
}
