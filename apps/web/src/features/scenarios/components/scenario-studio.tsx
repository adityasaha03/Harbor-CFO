'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Sparkles, AlertCircle, FileCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ScenarioChange, CreateScenarioResponse } from '@harbor/contracts';
import { usePermission } from '@/features/auth';
import { useCreateScenario } from '../api/use-create-scenario';
import { SCENARIO_PRESETS, parsePresetParams, type ScenarioPreset } from '../lib/presets';
import { PresetButtons } from './preset-buttons';
import { ChangeList } from './change-list';
import { ChangeBuilder } from './change-builder';
import { StaleBanner } from './stale-banner';
import { RepaymentWarning } from './repayment-warning';
import { ComparisonChart } from './comparison-chart';
import { ComparisonMetrics } from './comparison-metrics';
import { toast } from 'sonner';

export function ScenarioStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const canWrite = usePermission('scenarios:write');
  const canPropose = usePermission('actions:propose');

  const [name, setName] = React.useState('Scenario What-If');
  const [changes, setChanges] = React.useState<ScenarioChange[]>([]);
  const [activeScenario, setActiveScenario] = React.useState<CreateScenarioResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const createScenarioMutation = useCreateScenario();

  // Handle URL preset prefill on mount
  React.useEffect(() => {
    if (!searchParams) return;
    const parsed = parsePresetParams(searchParams);
    if (!parsed) return;

    const matchedPreset =
      SCENARIO_PRESETS.find((p) => p.id === parsed.presetId) ??
      (parsed.offerCode ? SCENARIO_PRESETS.find((p) => p.id === 'bridge-loan') : undefined);

    if (matchedPreset) {
      const initialChanges = matchedPreset.buildChanges({
        offerCode: parsed.offerCode,
        amountMinor: parsed.amountMinor,
      });
      setChanges(initialChanges);
      setName(matchedPreset.label);
    }
  }, [searchParams]);

  const handleSelectPreset = (preset: ScenarioPreset) => {
    setChanges(preset.buildChanges({}));
    setName(preset.label);
    setErrorMessage(null);
    toast.info(`Loaded scenario preset: "${preset.label}"`);
  };

  const handleAddChange = (newChange: ScenarioChange) => {
    setChanges((prev) => [...prev, newChange]);
    setErrorMessage(null);
    toast.success('Added modification to scenario builder');
  };

  const handleRemoveChange = (index: number) => {
    setChanges((prev) => prev.filter((_, i) => i !== index));
    toast.info('Removed modification from scenario');
  };

  const handleRunScenario = async () => {
    if (changes.length === 0) {
      const msg = 'Please add at least one change before simulating.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    setErrorMessage(null);

    try {
      const scenarioName = name.trim() || 'Custom Scenario';
      const response = await createScenarioMutation.mutateAsync({
        name: scenarioName,
        changes,
      });
      setActiveScenario(response);
      toast.success(`Simulation completed: "${scenarioName}"!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create scenario.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const hasFinancing =
    changes.some((c) => c.type === 'add_financing') ||
    (activeScenario && activeScenario.financing.principalMinor > 0);

  return (
    <div className="space-y-6" data-testid="scenario-studio">
      {/* Top Presets & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-card shadow-xs">
        <PresetButtons onSelectPreset={handleSelectPreset} disabled={!canWrite} />
        {changes.length > 0 && canWrite && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setChanges([]);
              setActiveScenario(null);
              toast.info('Scenario modifications cleared');
            }}
            data-testid="clear-scenario-btn"
          >
            Clear Changes
          </Button>
        )}
      </div>

      {/* Main Split Layout: Builder on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Builder */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Scenario Builder</CardTitle>
              <CardDescription className="text-xs">
                Model cash flow modifications without committing changes to actuals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canWrite && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300"
                  data-testid="reviewer-readonly-notice"
                >
                  Reviewers have read-only access and cannot create scenarios.
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="scenario-name" className="text-xs font-medium text-foreground">
                  Scenario Name
                </label>
                <Input
                  id="scenario-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Early Collection + Bridge"
                  disabled={!canWrite}
                  data-testid="scenario-name-input"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Modifications ({changes.length})
                  </span>
                </div>
                <ChangeList changes={changes} onRemove={handleRemoveChange} />
              </div>

              {canWrite && <ChangeBuilder onAdd={handleAddChange} />}

              {errorMessage && (
                <p className="text-xs text-destructive flex items-center gap-1.5" data-testid="scenario-error">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errorMessage}
                </p>
              )}

              <Button
                className="w-full gap-2"
                onClick={handleRunScenario}
                disabled={!canWrite || changes.length === 0 || createScenarioMutation.isPending}
                data-testid="run-scenario-btn"
              >
                <Play className="h-4 w-4" />
                {createScenarioMutation.isPending ? 'Simulating…' : 'Simulate Scenario'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-4">
          {!activeScenario ? (
            <Card className="border-dashed" data-testid="scenario-empty-state">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No Scenario Simulated Yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Select a preset above or add manual changes to compare how what-if actions impact
                    liquidity, minimum cash, and repayment requirements.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="scenario-results">
              {activeScenario.isStale && (
                <StaleBanner
                  onRegenerate={handleRunScenario}
                  isRegenerating={createScenarioMutation.isPending}
                />
              )}

              {activeScenario.financing.repaymentWarnings.length > 0 && (
                <RepaymentWarning warnings={activeScenario.financing.repaymentWarnings} />
              )}

              <ComparisonChart points={activeScenario.points} />

              <ComparisonMetrics comparison={activeScenario} />

              {hasFinancing && canPropose && (
                <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Financing Remedy Ready
                      </p>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                        Turn this simulated financing into an actionable proposal for approval.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
                      onClick={() => {
                        toast.info('Initiating formal Action Proposal from simulated scenario');
                        router.push(`/actions?scenarioId=${activeScenario.scenarioId}`);
                      }}
                      data-testid="create-action-proposal-btn"
                    >
                      Create Action Proposal
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
