'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { StyleToggle } from './style-toggle';
import type { AgentStyle } from '@harbor/contracts';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  onSubmit: (prompt: string, style: AgentStyle) => void;
  isLoading?: boolean;
  canUseAgent: boolean;
  style: AgentStyle;
  onStyleChange: (style: AgentStyle) => void;
  errorMessage?: string | null;
}

const MAX_CHARS = 1000;

/**
 * Chat input box with character countdown, style selector, and role permissions guard.
 */
export function ChatInput({
  onSubmit,
  isLoading = false,
  canUseAgent,
  style,
  onStyleChange,
  errorMessage,
}: ChatInputProps) {
  const [prompt, setPrompt] = React.useState('');

  const charCount = prompt.length;
  const isTooLong = charCount > MAX_CHARS;
  const isValid = prompt.trim().length > 0 && !isTooLong && !isLoading && canUseAgent;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValid) return;
    onSubmit(prompt.trim(), style);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs">
      {!canUseAgent && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            Reviewers have read-only access. You can view past runs and timelines, but cannot trigger new runs.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          canUseAgent
            ? 'Ask about cash gaps, overdue invoices, financing matches, or scenario impacts...'
            : 'Chat disabled for reviewer role'
        }
        disabled={!canUseAgent || isLoading}
        maxLength={MAX_CHARS + 50}
        rows={3}
        className={cn(
          'resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 text-sm leading-relaxed',
          !canUseAgent && 'cursor-not-allowed opacity-60',
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
        <StyleToggle
          value={style}
          onChange={onStyleChange}
          disabled={!canUseAgent || isLoading}
        />

        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-[11px] font-mono',
              isTooLong ? 'text-destructive font-semibold' : 'text-muted-foreground',
            )}
          >
            {charCount}/{MAX_CHARS}
          </span>

          <Button
            type="button"
            size="sm"
            disabled={!isValid}
            onClick={() => handleSubmit()}
            className="h-8 gap-1.5 px-3 text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
