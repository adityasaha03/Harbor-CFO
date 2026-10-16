// Public API for feature 'proof'
export { CurrentRoleCard } from './components/current-role-card';
export { PermissionMatrix } from './components/permission-matrix';
export { CheckCard } from './components/check-card';
export { CheckResult } from './components/check-result';
export { LiveChecks } from './components/live-checks';
export { AuditLogTable } from './components/audit-log-table';
export { EvidenceDownload } from './components/evidence-download';
export { KnownLimitations } from './components/known-limitations';

// Hooks and API helpers
export { useProofChecks } from './api/use-proof-checks';
export { useRunProofCheck } from './api/use-run-proof-check';
export { useAuditEvents } from './api/use-audit-events';
export { downloadEvidenceBundle } from './api/download-evidence';
