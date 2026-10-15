import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Imports"
        description="Upload bank statements and invoice ledgers for cash flow ingestion."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Import workspace will be initialized in chunk F06.
        </CardContent>
      </Card>
    </div>
  );
}
