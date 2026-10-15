import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Studio"
        description="Model non-committing what-if cash modifications and remedy comparisons."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Scenario studio will be initialized in chunk F10.
        </CardContent>
      </Card>
    </div>
  );
}
