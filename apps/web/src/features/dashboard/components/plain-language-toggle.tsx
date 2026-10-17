'use client';

import * as React from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlainLanguage } from './plain-language-context';
import { cn } from '@/lib/utils';

export function PlainLanguageToggle() {
  const { isPlainLanguage, togglePlainLanguage } = usePlainLanguage();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={togglePlainLanguage}
      className={cn(
        'h-7 px-2.5 text-xs font-medium transition-all gap-1.5',
        isPlainLanguage
          ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={isPlainLanguage}
      aria-label="Toggle plain-language financial terms"
      data-testid="plain-language-toggle"
    >
      <Type className="h-3.5 w-3.5" />
      <span>{isPlainLanguage ? 'Plain Language: ON' : 'Plain Language: OFF'}</span>
    </Button>
  );
}

