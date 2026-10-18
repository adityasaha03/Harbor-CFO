import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import { ImportWorkspace } from '@/features/imports';
import { FileSpreadsheet } from 'lucide-react';

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Your Data"
        description="Upload your bank statements and invoices as CSV files to keep your financial picture up to date."
      />
      <PageIntro
        storageKey="harbor_intro_imports"
        icon={FileSpreadsheet}
        title="How do I upload my data?"
        description="Drag and drop your CSV files (bank transactions or invoices) into the upload area below. We'll check everything for errors before importing, and you can preview the data before confirming."
        tips={[
          'Download the sample template first to see the expected format',
          'Dates can be in YYYY-MM-DD or MM/DD/YYYY format',
          "If there are any errors, we'll show you exactly which rows need fixing",
        ]}
      />
      <ImportWorkspace />
    </div>
  );
}
