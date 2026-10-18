'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePermission } from '@/features/auth';
import type { ImportPreviewResponse, ImportDto } from '@harbor/contracts';
import { TemplateLinks } from './template-links';
import { FileDropzone } from './file-dropzone';
import { SmartMapperCard } from './smart-mapper-card';
import { PreviewTable } from './preview-table';
import { ErrorList } from './error-list';
import { CommitBar } from './commit-bar';
import { ImportHistoryTable } from './import-history-table';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';


export function ImportWorkspace() {
  const canWriteImports = usePermission('imports:write');

  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null);
  const [committedResult, setCommittedResult] = React.useState<ImportDto | null>(null);
  const [mode, setMode] = React.useState<'standard' | 'smart'>('standard');

  const handleReset = () => {
    setPreview(null);
    setCommittedResult(null);
  };

  const handlePreviewSuccess = (data: ImportPreviewResponse) => {
    setCommittedResult(null);
    setPreview(data);
  };

  const handleCommitted = (dto: ImportDto) => {
    setPreview(null);
    setCommittedResult(dto);
  };


  return (
    <div className="space-y-8" data-testid="import-workspace">
      {/* Header and Templates */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Imports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload transaction and invoice CSVs. All imports are staged with atomic row-level validation.
          </p>
        </div>
        {canWriteImports && <TemplateLinks />}
      </div>

      {/* Main Action Area */}
      {!canWriteImports ? (
        <div
          className="rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground"
          data-testid="reviewer-readonly-notice"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Read-Only Access</p>
              <p>
                Your account has Reviewer permissions. You can inspect historical imports, error reports, and audit trails below, but cannot upload or commit new data files.
              </p>
            </div>
          </div>
        </div>
      ) : committedResult ? (
        /* Success Panel */
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100 space-y-4"
          data-testid="import-success-panel"
        >
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Import Committed Successfully</h2>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                Atomically committed <strong>{committedResult.acceptedRows}</strong> records from{' '}
                <span className="font-mono">{committedResult.fileName}</span> into your{' '}
                <span className="capitalize">{committedResult.kind}</span> ledger.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm" onClick={handleReset} data-testid="upload-another-btn">
              <FileCheck className="mr-2 h-4 w-4" />
              Upload Another File
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/forecast" className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                View Updated Forecast
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/alerts" className="flex items-center gap-1.5" data-testid="view-new-alerts-link">
                <AlertTriangle className="h-4 w-4" />
                View Risk Alerts
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      ) : preview ? (
        /* Preview or Error Staging Area */
        <div className="space-y-6">
          {preview.status === 'rejected' || preview.errors.length > 0 ? (
            <div className="space-y-4">
              <ErrorList
                errors={preview.errors}
                importId={preview.importId}
                fileName={preview.fileName}
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleReset} data-testid="error-reset-btn">
                  Choose a Different File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <PreviewTable preview={preview} />
              <CommitBar
                preview={preview}
                onCommitted={handleCommitted}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      ) : (
        /* Intake Section: Standard CSV or Smart AI Mapper */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Intake Method
            </span>
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'standard'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="standard-csv-tab"
              >
                <FileCheck className="h-3.5 w-3.5" />
                Standard CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setMode('smart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'smart'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="smart-ai-mapper-tab"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Smart AI Mapper
              </button>
            </div>
          </div>

          {mode === 'standard' ? (
            <FileDropzone onPreviewSuccess={handlePreviewSuccess} />
          ) : (
            <SmartMapperCard onPreviewSuccess={handlePreviewSuccess} />
          )}
        </div>
      )}


      {/* History Audit Table */}
      <div className="pt-4">
        <ImportHistoryTable />
      </div>
    </div>
  );
}
