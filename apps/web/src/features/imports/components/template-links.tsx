'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { downloadCsvTemplate } from '../lib/templates';
import type { ImportKind } from '@harbor/contracts';
import { toast } from 'sonner';

export function TemplateLinks() {
  const handleDownload = (kind: ImportKind) => {
    downloadCsvTemplate(kind);
    toast.success(`Downloaded sample ${kind === 'transactions' ? 'Transactions' : 'Invoices'} CSV template`);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground"
      data-testid="template-links"
    >
      <span className="font-medium text-foreground flex items-center gap-1.5">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        Sample Templates:
      </span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleDownload('transactions')}
        className="h-7 text-xs gap-1.5 border-border/80"
        data-testid="download-transactions-template"
      >
        <Download className="h-3 w-3" />
        Transactions CSV
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleDownload('invoices')}
        className="h-7 text-xs gap-1.5 border-border/80"
        data-testid="download-invoices-template"
      >
        <Download className="h-3 w-3" />
        Invoices CSV
      </Button>
    </div>
  );
}
