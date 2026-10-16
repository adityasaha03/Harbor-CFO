import storyData from '../replay/harbor-story.json';
import type {
  LlmProvider,
  LlmGenerateOptions,
  LlmGenerateResult,
  LlmToolResult,
} from './llm-provider';

interface StoryTurn {
  toolCalls: { name: string; args: Record<string, unknown> }[];
}

interface Story {
  intent: string;
  keywords: string[];
  turns: StoryTurn[];
  finalTemplate: string;
}

export class ReplayProvider implements LlmProvider {
  public readonly name = 'replay' as const;
  private readonly stories: Story[];

  constructor(customStories?: Story[]) {
    this.stories = customStories ?? (storyData.stories as Story[]);
  }

  private pickStory(prompt: string): Story {
    const lower = prompt.toLowerCase();
    for (const story of this.stories) {
      if (story.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return story;
      }
    }
    // Default to explain_gap or first story
    return this.stories.find((s) => s.intent === 'explain_gap') ?? this.stories[0]!;
  }

  private countExecutedTurns(options: LlmGenerateOptions): number {
    let turnCount = 0;
    for (const msg of options.messages) {
      if (msg.role === 'tool' && msg.toolResults && msg.toolResults.length > 0) {
        turnCount += 1;
      }
    }
    return turnCount;
  }

  private extractToolResults(options: LlmGenerateOptions): LlmToolResult[] {
    const results: LlmToolResult[] = [];
    for (const msg of options.messages) {
      if (msg.role === 'tool' && msg.toolResults) {
        results.push(...msg.toolResults);
      }
    }
    return results;
  }

  private renderTemplate(template: string, results: LlmToolResult[]): string {
    const values: Record<string, string> = {
      proposalId: 'prop_demo',
      principalFormatted: '¥60,000.00',
      upfrontFeeFormatted: '¥1,200.00',
      minCashFormatted: '-¥20,000.00',
      minCashDate: '2026-11-10',
      liquidityGapFormatted: '¥50,000.00',
      floorFormatted: '¥30,000.00',
      overdueCount: '1',
      totalOverdueFormatted: '¥40,000.00',
      bestOfferName: 'Bridge Term Loan',
      bestOfferPrincipal: '¥60,000.00',
      bestOfferCost: '¥3,000.00',
      bestOfferDay21: '¥38,800.00',
      requiredGapFormatted: '¥50,000.00',
    };

    for (const res of results) {
      const out = res.output as Record<string, unknown> | undefined;
      if (!out) continue;

      if (res.name === 'createActionProposal') {
        if (typeof out.proposalId === 'string') values.proposalId = out.proposalId;
        if (typeof out.principalFormatted === 'string') values.principalFormatted = out.principalFormatted;
        if (typeof out.upfrontFeeFormatted === 'string') values.upfrontFeeFormatted = out.upfrontFeeFormatted;
      }

      if (res.name === 'getForecast') {
        if (typeof out.minCashFormatted === 'string') values.minCashFormatted = out.minCashFormatted;
        if (typeof out.minCashDate === 'string') values.minCashDate = out.minCashDate;
        if (typeof out.liquidityGapFormatted === 'string') values.liquidityGapFormatted = out.liquidityGapFormatted;
        if (typeof out.floorFormatted === 'string') values.floorFormatted = out.floorFormatted;
      }

      if (res.name === 'listOverdueInvoices') {
        if (typeof out.count === 'number') values.overdueCount = String(out.count);
        if (typeof out.totalOverdueFormatted === 'string') values.totalOverdueFormatted = out.totalOverdueFormatted;
      }

      if (res.name === 'matchFinancing') {
        if (typeof out.requiredGapFormatted === 'string') values.requiredGapFormatted = out.requiredGapFormatted;
        const best = out.bestOffer as Record<string, unknown> | undefined;
        if (best) {
          if (typeof best.name === 'string') values.bestOfferName = best.name;
          if (typeof best.principalFormatted === 'string') values.bestOfferPrincipal = best.principalFormatted;
          if (typeof best.totalCostFormatted === 'string') values.bestOfferCost = best.totalCostFormatted;
          if (typeof best.cashAtDay21Formatted === 'string') values.bestOfferDay21 = best.cashAtDay21Formatted;
        }
      }
    }

    let rendered = template;
    for (const [key, val] of Object.entries(values)) {
      rendered = rendered.replaceAll(`{{${key}}}`, val);
    }
    return rendered;
  }

  async generate(options: LlmGenerateOptions): Promise<LlmGenerateResult> {
    const userMsg = options.messages.find((m) => m.role === 'user');
    const prompt = userMsg?.content ?? '';
    const story = this.pickStory(prompt);

    const executedTurns = this.countExecutedTurns(options);

    if (executedTurns < story.turns.length) {
      const nextTurn = story.turns[executedTurns];
      if (nextTurn) {
        return {
          toolCalls: nextTurn.toolCalls.map((tc, idx) => ({
            id: `call_${executedTurns}_${idx}`,
            name: tc.name,
            args: tc.args,
          })),
          usage: { inputTokens: 50, outputTokens: 25 },
        };
      }
    }

    const allResults = this.extractToolResults(options);
    const text = this.renderTemplate(story.finalTemplate, allResults);

    return {
      text,
      usage: { inputTokens: 100, outputTokens: 150 },
    };
  }
}
