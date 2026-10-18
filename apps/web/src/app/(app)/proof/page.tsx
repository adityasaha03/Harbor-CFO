import { PageHeader } from '@/components/layout/page-header';
import { PageIntro } from '@/components/layout/page-intro';
import {
  CurrentRoleCard,
  PermissionMatrix,
  LiveChecks,
  AuditLogTable,
  EvidenceDownload,
  KnownLimitations,
} from '@/features/proof';

export default function ProofPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Proof & Audit Trail"
        description="Download verified proof of all financial decisions and system checks — for your auditors, investors, or your own records."
      />
      <PageIntro
        storageKey="harbor_intro_proof"
        iconName="file-check-2"
        title="What is this page for?"
        description="Every financial decision in HarborCFO is recorded with a tamper-proof audit trail. This page lets you verify that the system is working correctly and download evidence packages for compliance or review."
        tips={[
          'The Live Checks section runs real-time tests to verify system integrity',
          'Download the Evidence Bundle to share verified records with auditors',
          'Your current role and permissions are shown at the top',
        ]}
      />
      <CurrentRoleCard />
      <LiveChecks />
      <PermissionMatrix />
      <AuditLogTable />
      <EvidenceDownload />
      <KnownLimitations />
    </div>
  );
}
