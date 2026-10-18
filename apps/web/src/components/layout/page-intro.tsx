'use client';

import * as React from 'react';
import {
  Lightbulb,
  X,
  TrendingUp,
  AlertTriangle,
  Landmark,
  GitBranch,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  Bot,
  FileCheck2,
  Sparkles,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PageIntroIconName =
  | 'trending-up'
  | 'alert-triangle'
  | 'landmark'
  | 'git-branch'
  | 'shield-check'
  | 'file-spreadsheet'
  | 'settings'
  | 'bot'
  | 'file-check-2'
  | 'sparkles'
  | 'info';

const ICON_MAP: Record<PageIntroIconName, LucideIcon> = {
  'trending-up': TrendingUp,
  'alert-triangle': AlertTriangle,
  'landmark': Landmark,
  'git-branch': GitBranch,
  'shield-check': ShieldCheck,
  'file-spreadsheet': FileSpreadsheet,
  'settings': Settings,
  'bot': Bot,
  'file-check-2': FileCheck2,
  'sparkles': Sparkles,
  'info': Info,
};

export interface PageIntroProps {
  storageKey: string;
  iconName?: PageIntroIconName;
  title: string;
  description: string;
  tips?: string[];
  className?: string;
}

export function PageIntro({
  storageKey,
  iconName = 'info',
  title,
  description,
  tips,
  className,
}: PageIntroProps) {
  const [isDismissed, setIsDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setIsDismissed(localStorage.getItem(storageKey) === 'true');
    } catch {
      setIsDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignored
    }
  };

  if (isDismissed) return null;

  const Icon = ICON_MAP[iconName] ?? Info;

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-r from-primary/5 to-background p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {tips && tips.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap gap-x-4 gap-y-1.5">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
