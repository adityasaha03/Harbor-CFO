'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SCENARIO_PRESETS, type ScenarioPreset } from '../lib/presets';

interface PresetButtonsProps {
  onSelectPreset: (preset: ScenarioPreset) => void;
  disabled?: boolean;
}

export function PresetButtons({ onSelectPreset, disabled }: PresetButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="preset-buttons">
      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Presets:
      </span>
      {SCENARIO_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2.5 hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={() => onSelectPreset(preset)}
          disabled={disabled}
          data-testid={`preset-btn-${preset.id}`}
          title={preset.description}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
