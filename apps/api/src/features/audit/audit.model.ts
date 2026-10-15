import mongoose, { type Model } from 'mongoose';
import type { AuditDecision } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface AuditEventDoc {
  id?: string;
  tenantId: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  decision: AuditDecision;
  reasonCode: string;
  resourceRefs: string[];
  payloadHash?: string;
  beforeVersion?: number;
  afterVersion?: number;
  traceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditEventSchema = createSchema<AuditEventDoc>({
  tenantId: { type: String, required: true, index: true },
  actorId: { type: String, required: false },
  actorRole: { type: String, required: false },
  action: { type: String, required: true },
  decision: { type: String, required: true, enum: ['allowed', 'denied'] },
  reasonCode: { type: String, required: true },
  resourceRefs: { type: [String], default: [] },
  payloadHash: { type: String, required: false },
  beforeVersion: { type: Number, required: false },
  afterVersion: { type: Number, required: false },
  traceId: { type: String, required: true },
});

// Compound index for paginated queries (newest first per tenant)
auditEventSchema.index({ tenantId: 1, createdAt: -1 });
// Trace ID index for distributed log tracing
auditEventSchema.index({ traceId: 1 });

export const AuditEventModel: Model<AuditEventDoc> =
  mongoose.models.AuditEvent || mongoose.model<AuditEventDoc>('AuditEvent', auditEventSchema, 'auditEvents');

