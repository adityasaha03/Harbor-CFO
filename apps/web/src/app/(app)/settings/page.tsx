import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { SettingsTabs } from '@/features/settings';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Team"
        description="Customize your business preferences, set safety targets, and manage who has access to your workspace."
      />
      <PageIntro
        storageKey="harbor_intro_settings"
        icon={Settings}
        title="What can I configure here?"
        description="This is where you set up your business rules — like how much emergency cash to keep, payment terms, and recurring expenses. Changes here automatically update your forecasts and alerts across the entire app."
        tips={[
          'Set your Liquidity Floor to the minimum cash you want to always have on hand',
          'Add recurring commitments (like rent or payroll) so they show in your forecast',
          'Add team members by their name and email — they can sign in afterwards',
        ]}
      />
      <React.Suspense fallback={null}>
        <SettingsTabs />
      </React.Suspense>
    </div>
  );
}
