import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Copilot Agent"
        description="Conversational agent with read-only reasoning and audit-logged tool calls."
      />
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
          Agent interface and execution timeline will be initialized in chunk F12.
        </CardContent>
      </Card>
    </div>
  );
}
