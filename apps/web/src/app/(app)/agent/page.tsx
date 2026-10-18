import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { AgentWorkspace } from '@/features/agent';

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Finance Assistant"
        description="Chat with your AI assistant to get answers about your finances, explore options, and get personalized recommendations."
      />
      <PageIntro
        storageKey="harbor_intro_agent"
        iconName="bot"
        title="Meet your finance assistant"
        description="Ask me anything about your business finances in plain English! I can explain your cash forecast, suggest ways to improve cash flow, help you understand alerts, and guide you through financial decisions."
        tips={[
          'Try asking: "Why is my cash running low next month?"',
          'Or: "What are my options to cover the shortfall?"',
          'I can only suggest actions — you always make the final decision',
        ]}
      />
      <AgentWorkspace />
    </div>
  );
}
