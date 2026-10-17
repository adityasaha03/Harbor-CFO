'use client';

import * as React from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IMPORT_LIMITS, type ImportKind, type ImportPreviewResponse } from '@harbor/contracts';
import { usePreviewImport } from '../api/use-preview-import';
import { toast } from 'sonner';

export interface FileDropzoneProps {
  onPreviewSuccess?: (preview: ImportPreviewResponse) => void;
  onFileSelect?: (file: File, kind: ImportKind) => void;
  isLoading?: boolean;
}

export function FileDropzone({ onPreviewSuccess, onFileSelect, isLoading }: FileDropzoneProps) {
  const [kind, setKind] = React.useState<ImportKind>('transactions');
  const [dragActive, setDragActive] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const previewMutation = usePreviewImport();
  const isUploading = isLoading || previewMutation.isPending;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndHandleFile = async (file: File) => {
    setClientError(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      const msg = 'Invalid file type: Only .csv files are supported.';
      setClientError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > IMPORT_LIMITS.MAX_FILE_BYTES) {
      const msg = 'File exceeds 5 MB maximum limit.';
      setClientError(msg);
      toast.error(msg);
      return;
    }

    let activeKind = kind;
    try {
      const chunk = await file.slice(0, 1024).text();
      const firstLine = chunk.split(/\r?\n/)[0]?.toLowerCase() ?? '';
      const hasInvoiceFields = firstLine.includes('invoiceid') || firstLine.includes('counterpartyid');
      const hasTxFields = firstLine.includes('accountid') || firstLine.includes('category');

      if (hasInvoiceFields && activeKind !== 'invoices') {
        activeKind = 'invoices';
        setKind('invoices');
        toast.info('Auto-detected Invoice CSV headers; switched mode to Invoices');
      } else if (hasTxFields && activeKind !== 'transactions') {
        activeKind = 'transactions';
        setKind('transactions');
        toast.info('Auto-detected Transaction CSV headers; switched mode to Bank Transactions');
      }
    } catch {
      // Non-blocking fallback
    }

    setSelectedFile(file);
    onFileSelect?.(file, activeKind);

    if (onPreviewSuccess) {
      try {
        const preview = await previewMutation.mutateAsync({ file, kind: activeKind });
        if (preview.status === 'rejected') {
          toast.error(`File rejected: ${preview.errors[0]?.message ?? 'CSV validation issues found'}`);
        } else {
          toast.success(`Parsed "${file.name}": ${preview.rowCount} records staged for preview.`);
        }
        onPreviewSuccess(preview);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to preview file';
        setClientError(msg);
        toast.error(msg);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      void validateAndHandleFile(e.target.files[0]);
    }
  };

  const handleKindChange = (newKind: ImportKind) => {
    setKind(newKind);
    setSelectedFile(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4" data-testid="file-dropzone">
      {/* 1. Kind Selection Toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Import Record Type</Label>
        <div
          role="radiogroup"
          aria-label="Select import record type"
          className="grid grid-cols-2 gap-3 max-w-md"
        >
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'transactions'}
            onClick={() => handleKindChange('transactions')}
            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
              kind === 'transactions'
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-border/80 bg-background hover:bg-muted/30 text-muted-foreground'
            }`}
            data-testid="kind-transactions-btn"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Bank Transactions</p>
              <p className="text-[11px] text-muted-foreground">Historical ledger entries & flows</p>
            </div>
            {kind === 'transactions' && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={kind === 'invoices'}
            onClick={() => handleKindChange('invoices')}
            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
              kind === 'invoices'
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-border/80 bg-background hover:bg-muted/30 text-muted-foreground'
            }`}
            data-testid="kind-invoices-btn"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Invoices (AR & AP)</p>
              <p className="text-[11px] text-muted-foreground">Receivables & payables ledger</p>
            </div>
            {kind === 'invoices' && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
          </button>
        </div>
      </div>

      {/* 2. Drag & Drop Surface */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragActive
            ? 'border-primary bg-primary/10 scale-[1.005]'
            : 'border-border/80 bg-muted/10 hover:bg-muted/20 hover:border-primary/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        data-testid="dropzone-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
          data-testid="file-input"
        />

        <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
          {isUploading ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>

        <p className="text-sm font-semibold text-foreground text-center">
          {isUploading ? (
            'Validating & generating preview...'
          ) : selectedFile ? (
            <span className="flex items-center gap-1.5 text-primary">
              <FileText className="h-4 w-4" />
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          ) : (
            'Click to browse or drop your CSV file here'
          )}
        </p>

        <p className="text-xs text-muted-foreground text-center mt-1">
          Supported format: .csv (Max 5 MB, up to 10,000 rows). Evaluated atomically.
        </p>

        {selectedFile && !isUploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Clear / Select another file
          </Button>
        )}
      </div>

      {/* 3. Client Validation Error */}
      {clientError && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2"
          data-testid="client-validation-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{clientError}</span>
        </div>
      )}
    </div>
  );
}
