'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Upload,
  Download,
  ArrowRight,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { ImportKind, TransformImportResponse, ImportPreviewResponse } from '@harbor/contracts';
import { useTransformImport } from '../api/use-transform-import';
import { usePreviewImport } from '../api/use-preview-import';
import { toast } from 'sonner';

export interface SmartMapperCardProps {
  onPreviewSuccess: (data: ImportPreviewResponse) => void;
}

/**
 * Smart AI Data Mapper component.
 * Converts messy or unstructured business spreadsheets/text into canonical CSV format,
 * offering direct download and 1-click staging into the preview/commit pipeline.
 */
export function SmartMapperCard({ onPreviewSuccess }: SmartMapperCardProps) {
  const [kind, setKind] = React.useState<ImportKind>('invoices');
  const [inputMode, setInputMode] = React.useState<'upload' | 'paste'>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [rawText, setRawText] = React.useState('');
  const [result, setResult] = React.useState<TransformImportResponse | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const transformMutation = useTransformImport();
  const previewMutation = usePreviewImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    try {
      const text = await selected.text();
      setRawText(text);
      toast.info(`Loaded ${selected.name} (${(selected.size / 1024).toFixed(1)} KB)`);
    } catch {
      toast.error('Could not read file text. Please try pasting the content directly.');
    }
  };

  const handleTransform = () => {
    if (!rawText.trim()) {
      toast.error('Please upload a file or paste business data to transform');
      return;
    }

    transformMutation.mutate(
      {
        kind,
        rawContent: rawText,
        fileName: file?.name ?? `${kind}-unstructured.txt`,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`Standardized ${data.rowCount} records into canonical ${kind} CSV!`);
        },
        onError: (err) => {
          toast.error(err.message || 'AI transformation failed. Ensure data contains tabular rows.');
        },
      },
    );
  };

  const handleDownloadCsv = () => {
    if (!result?.csvContent) return;
    const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${kind}-standardized-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success('Downloaded standardized CSV');
  };

  const handleSendToPreview = () => {
    if (!result?.csvContent) return;
    const csvFile = new File(
      [result.csvContent],
      file?.name ? `${file.name.replace(/\.[^/.]+$/, '')}-mapped.csv` : `${kind}-mapped.csv`,
      { type: 'text/csv' },
    );

    previewMutation.mutate(
      { file: csvFile, kind },
      {
        onSuccess: (previewData) => {
          toast.success('Sent to Atomic Import Preview!');
          onPreviewSuccess(previewData);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to stage transformed file in import preview.');
        },
      },
    );
  };

  const handleReset = () => {
    setFile(null);
    setRawText('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = transformMutation.isPending || previewMutation.isPending;

  return (
    <Card className="border border-border/80 shadow-xs bg-card">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Smart AI Data Mapper</CardTitle>
              <CardDescription className="text-xs">
                Upload or paste messy, scattered business spreadsheets without matching exact column headers.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Target Schema:</span>
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setKind('invoices');
                  setResult(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  kind === 'invoices' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                Invoices (AR/AP)
              </button>
              <button
                type="button"
                onClick={() => {
                  setKind('transactions');
                  setResult(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  kind === 'transactions' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                Bank Transactions
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {!result ? (
          <>
            {/* Input Method Tabs */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'paste')}>
              <div className="flex items-center justify-between pb-2">
                <TabsList className="h-8">
                  <TabsTrigger value="upload" className="text-xs px-3">
                    <Upload className="h-3 w-3 mr-1.5" />
                    Upload File (.xlsx, .csv, .txt)
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="text-xs px-3">
                    <FileText className="h-3 w-3 mr-1.5" />
                    Paste Data Directly
                  </TabsTrigger>
                </TabsList>
                {file && (
                  <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs text-muted-foreground">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {inputMode === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/30 transition-all rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.tsv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform mb-3">
                    <Upload className="h-5 w-5" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Click or drag to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Drop any business file or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accepts raw CSV, TSV, tab-delimited text, or messy spreadsheet exports (up to 5MB)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste unformatted rows, copy-pasted Excel tables, or invoice notes here..."
                    className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tip: You can copy cells directly from Excel or Google Sheets and paste them here.
                  </p>
                </div>
              )}
            </Tabs>

            {/* Transform Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Document content is isolated securely. The AI strictly extracts table fields.</span>
              </div>
              <Button
                onClick={handleTransform}
                disabled={isLoading || !rawText.trim()}
                className="gap-2"
                size="sm"
              >
                {transformMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Standardizing Schema...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Standardize with AI
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Result & Conversion Panel */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Status & Actions */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
                      Standardization Complete
                    </h3>
                    <Badge variant="secondary" className="text-xs font-medium bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                      {result.rowCount} records mapped
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target Schema: <span className="font-semibold text-foreground capitalize">{kind}</span> • {result.detectedColumns.length} columns aligned
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="self-start sm:self-center h-8 text-xs gap-1.5 shrink-0 bg-background/80 hover:bg-background"
              >
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                Map Another File
              </Button>
            </div>

            {/* Warnings if any (Spacious, Clean) */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Transformed Data Preview Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Transformed Records Preview
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Showing {Math.min(result.sampleRows.length, 10)} of {result.rowCount} extracted records formatted to canonical standards.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground hidden sm:inline-flex">
                  canonical_{kind}.csv
                </Badge>
              </div>

              <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs text-muted-foreground border-b font-medium z-10">
                      <tr>
                        {result.detectedColumns.map((col) => (
                          <th
                            key={col}
                            className={`px-4 py-3 whitespace-nowrap font-semibold uppercase tracking-wider text-[11px] ${
                              col === 'total' || col === 'outstanding' || col === 'amount' ? 'text-right' : ''
                            }`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {result.sampleRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          {result.detectedColumns.map((col) => {
                            const val = String(row[col] ?? '');
                            const isAmount = col === 'total' || col === 'outstanding' || col === 'amount';
                            const isDirection = col === 'direction';
                            const isStatus = col === 'status';

                            return (
                              <td
                                key={col}
                                className={`px-4 py-3 whitespace-nowrap ${
                                  isAmount ? 'text-right font-mono font-medium text-foreground' : ''
                                }`}
                              >
                                {isDirection ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                                      val === 'AR'
                                        ? 'border-blue-500/30 bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                        : 'border-purple-500/30 bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                    }`}
                                  >
                                    {val}
                                  </Badge>
                                ) : isStatus ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 font-medium capitalize ${
                                      val === 'paid'
                                        ? 'border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : val === 'partially_paid'
                                        ? 'border-amber-500/30 bg-amber-50/50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                        : 'border-blue-500/30 bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                    }`}
                                  >
                                    {val}
                                  </Badge>
                                ) : isAmount ? (
                                  <span>
                                    ¥{val}
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] text-foreground/90">
                                    {val}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Dual Actions Bar (Spacious Footer) */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Download as CSV or stage directly into atomic preview for double-entry verification.
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleDownloadCsv}
                  className="flex-1 sm:flex-initial gap-2 text-xs h-10 px-4"
                >
                  <Download className="h-4 w-4" />
                  Download Formatted CSV
                </Button>

                <Button
                  size="default"
                  onClick={handleSendToPreview}
                  disabled={previewMutation.isPending}
                  className="flex-1 sm:flex-initial gap-2 text-xs h-10 px-5 shadow-xs"
                >
                  {previewMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Staging for Preview...
                    </>
                  ) : (
                    <>
                      <span>Send to Import Preview</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
