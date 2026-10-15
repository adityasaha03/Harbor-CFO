import type { ClientSession } from 'mongoose';
import type { AuditEventDto, RecordAuditInput, AuditQuery } from '@harbor/contracts';
import { AuditEventModel } from './audit.model';

export const auditRepository = {
  /**
   * Records a single audit event document in the database.
   * Supports joining an existing transaction session.
   */
  async record(
    input: RecordAuditInput,
    session?: ClientSession,
  ): Promise<AuditEventDto> {
    const docs = await AuditEventModel.create(
      [
        {
          tenantId: input.tenantId,
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: input.action,
          decision: input.decision,
          reasonCode: input.reasonCode,
          resourceRefs: input.resourceRefs ?? [],
          payloadHash: input.payloadHash,
          beforeVersion: input.beforeVersion,
          afterVersion: input.afterVersion,
          traceId: input.traceId,
        },
      ],
      { session },
    );

    const doc = docs[0];
    if (!doc) {
      throw new Error('Failed to create audit document');
    }
    return {
      id: String(doc._id),
      tenantId: doc.tenantId,
      actorId: doc.actorId,
      actorRole: doc.actorRole,
      action: doc.action,
      decision: doc.decision,
      reasonCode: doc.reasonCode,
      resourceRefs: doc.resourceRefs,
      payloadHash: doc.payloadHash,
      beforeVersion: doc.beforeVersion,
      afterVersion: doc.afterVersion,
      traceId: doc.traceId,
      createdAt: doc.createdAt.toISOString(),
    };
  },

  /**
   * Lists audit events for a tenant, paginated and sorted newest first.
   */
  async list(
    tenantId: string,
    query: AuditQuery,
  ): Promise<{ items: AuditEventDto[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const filter = { tenantId };

    const [total, docs] = await Promise.all([
      AuditEventModel.countDocuments(filter),
      AuditEventModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const items: AuditEventDto[] = docs.map((doc) => ({
      id: String(doc._id),
      tenantId: doc.tenantId,
      actorId: doc.actorId,
      actorRole: doc.actorRole,
      action: doc.action,
      decision: doc.decision,
      reasonCode: doc.reasonCode,
      resourceRefs: doc.resourceRefs ?? [],
      payloadHash: doc.payloadHash,
      beforeVersion: doc.beforeVersion,
      afterVersion: doc.afterVersion,
      traceId: doc.traceId,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    }));

    return { items, total };
  },
};
