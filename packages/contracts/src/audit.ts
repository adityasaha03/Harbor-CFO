import { z } from 'zod';
import { paginationQuerySchema } from './common/pagination';

export const AUDIT_DECISIONS = ['allowed', 'denied'] as const;
export type AuditDecision = (typeof AUDIT_DECISIONS)[number];
export const auditDecisionSchema = z.enum(AUDIT_DECISIONS);

export const auditEventDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorId: z.string().optional(),
  actorRole: z.string().optional(),
  action: z.string(),
  decision: auditDecisionSchema,
  reasonCode: z.string(),
  resourceRefs: z.array(z.string()).default([]),
  payloadHash: z.string().optional(),
  beforeVersion: z.number().int().optional(),
  afterVersion: z.number().int().optional(),
  traceId: z.string(),
  createdAt: z.string(),
});
export type AuditEventDto = z.infer<typeof auditEventDtoSchema>;

export const recordAuditInputSchema = z.object({
  tenantId: z.string(),
  actorId: z.string().optional(),
  actorRole: z.string().optional(),
  action: z.string(),
  decision: auditDecisionSchema,
  reasonCode: z.string(),
  resourceRefs: z.array(z.string()).default([]),
  payloadHash: z.string().optional(),
  beforeVersion: z.number().int().optional(),
  afterVersion: z.number().int().optional(),
  traceId: z.string(),
});
export type RecordAuditInput = z.infer<typeof recordAuditInputSchema>;

export const auditQuerySchema = paginationQuerySchema;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
