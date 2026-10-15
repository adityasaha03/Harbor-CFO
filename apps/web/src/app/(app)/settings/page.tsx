import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Team"
        description="Tenant configuration, liquidity floor target, and team member roles."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Settings and team management workspace will be initialized in chunk F14.
        </CardContent>
      </Card>
    </div>
  );
}
