import { PageHeader } from '@/components/layout/page-header';
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
        title="Proof & Security Audit"
        description="Tamper-evident audit logs, live adversarial checks, RBAC verification, and competition evidence export."
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
