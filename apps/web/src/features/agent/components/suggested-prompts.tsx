'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const SUGGESTED_PROMPTS = [
  'What is causing the cash gap?',
  'Which overdue invoices matter most?',
  'Compare my financing options',
  'Propose the best way to close the gap',
] as const;

export interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Suggested prompt chips to help users quickly start common CFO financial investigations.
 */
export function SuggestedPrompts({ onSelectPrompt, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Suggested questions:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelectPrompt(prompt)}
            className="h-auto py-1.5 px-3 text-xs text-left font-normal bg-card hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
