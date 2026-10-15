import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Active financial risks, liquidity floor breaches, and concentration warnings."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Alerts panel will be initialized in chunk F08.
        </CardContent>
      </Card>
    </div>
  );
}
