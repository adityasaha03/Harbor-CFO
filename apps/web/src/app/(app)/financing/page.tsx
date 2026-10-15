import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function FinancingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financing Options"
        description="Ranked simulated financing offers, total borrowing costs, and eligibility."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Financing comparison catalog will be initialized in chunk F09.
        </CardContent>
      </Card>
    </div>
  );
}
