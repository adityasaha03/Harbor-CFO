import { PageHeader } from '@/components/layout/page-header';
import { AgentWorkspace } from '@/features/agent';

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Copilot Agent"
        description="Conversational finance intelligence with real-time tool telemetry and strict human-in-the-loop approvals."
      />
      <AgentWorkspace />
    </div>
  );
}
