import { z } from 'zod';

// ---------------------------------------------------------------------------
// Proof Checks Schemas & Types
// ---------------------------------------------------------------------------

export const PROOF_CHECK_IDS = [
  'employee-execute',
  'cross-tenant-lookup',
  'injection-import',
] as const;

export const proofCheckIdSchema = z.enum(PROOF_CHECK_IDS);
export type ProofCheckId = z.infer<typeof proofCheckIdSchema>;

export const proofCheckStateSchema = z.record(z.unknown());
export type ProofCheckState = z.infer<typeof proofCheckStateSchema>;

export const proofCheckRunResultSchema = z.object({
  checkId: proofCheckIdSchema,
  title: z.string(),
  passed: z.boolean(),
  expected: z.string(),
  actual: z.string(),
  message: z.string().optional(),
  stateBefore: proofCheckStateSchema.optional(),
  stateAfter: proofCheckStateSchema.optional(),
  executedAt: z.string(),
});
export type ProofCheckRunResult = z.infer<typeof proofCheckRunResultSchema>;

export const proofCheckItemSchema = z.object({
  id: proofCheckIdSchema,
  title: z.string(),
  description: z.string(),
  lastResult: proofCheckRunResultSchema.optional(),
});
export type ProofCheckItem = z.infer<typeof proofCheckItemSchema>;

export const proofCheckCatalogSchema = z.object({
  checks: z.array(proofCheckItemSchema),
});
export type ProofCheckCatalog = z.infer<typeof proofCheckCatalogSchema>;

// ---------------------------------------------------------------------------
// Evidence Export Schemas & Types
// ---------------------------------------------------------------------------

export const operationEvidenceRecordSchema = z.object({
  traceId: z.string(),
  tenantAlias: z.string(),
  actorAlias: z.string(),
  action: z.string(),
  mode: z.literal('simulated'),
  proposalId: z.string().optional(),
  payloadHash: z.string().optional(),
  inputVersion: z.number().int().optional(),
  outputVersion: z.number().int().optional(),
  permissionDecision: z.enum(['allowed', 'denied']),
  ledgerEntryRefs: z.array(z.string()).default([]),
  forecastBeforeRef: z.string().optional(),
  forecastAfterRef: z.string().optional(),
  timestamp: z.string(),
});
export type OperationEvidenceRecord = z.infer<typeof operationEvidenceRecordSchema>;

export const agentToolEvidenceRecordSchema = z.object({
  runId: z.string(),
  toolName: z.string(),
  argsSanitized: z.record(z.unknown()),
  resultSummary: z.string(),
  durationMs: z.number().int(),
  timestamp: z.string(),
});
export type AgentToolEvidenceRecord = z.infer<typeof agentToolEvidenceRecordSchema>;

export const permissionTestRecordSchema = z.object({
  testName: z.string(),
  actorRole: z.string(),
  permission: z.string(),
  expectedDecision: z.enum(['allowed', 'denied']),
  actualDecision: z.enum(['allowed', 'denied']),
  stateChanged: z.boolean(),
  passed: z.boolean(),
  details: z.string().optional(),
});
export type PermissionTestRecord = z.infer<typeof permissionTestRecordSchema>;

export const runMetadataSchema = z.object({
  commit: z.string(),
  seedVersion: z.number().int(),
  environment: z.string(),
  llmProvider: z.string(),
  timestamp: z.string(),
  nodeVersion: z.string(),
});
export type RunMetadata = z.infer<typeof runMetadataSchema>;

export const evidenceBundleSchema = z.object({
  runMetadata: runMetadataSchema,
  operations: z.array(operationEvidenceRecordSchema),
  agentTools: z.array(agentToolEvidenceRecordSchema),
  permissionTests: z.array(permissionTestRecordSchema),
  forecastsBefore: z.record(z.unknown()),
  forecastsAfter: z.record(z.unknown()),
  importReport: z.record(z.unknown()),
  evidenceSummary: z.string(),
  manifest: z.record(z.string()),
});
export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;

// ---------------------------------------------------------------------------
// Demo Reset Schemas & Types
// ---------------------------------------------------------------------------

export const demoResetResponseSchema = z.object({
  tenantId: z.string(),
  slug: z.string(),
  status: z.literal('reset_completed'),
  seededAt: z.string(),
});
export type DemoResetResponse = z.infer<typeof demoResetResponseSchema>;
