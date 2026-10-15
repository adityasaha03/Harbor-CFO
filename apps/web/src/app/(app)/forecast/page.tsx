import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Forecast"
        description="91-day deterministic cash trajectory with drill-down cash flow provenance."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Forecast trajectory viewer will be initialized in chunk F07.
        </CardContent>
      </Card>
    </div>
  );
}
