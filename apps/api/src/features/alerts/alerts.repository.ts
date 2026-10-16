import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type { AlertDto, AlertStatus } from '@harbor/contracts';
import { AlertModel, type AlertDoc } from './alerts.model';
import type { CandidateAlert } from './engine/types';

function toDto(doc: AlertDoc): AlertDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    ruleId: doc.ruleId,
    fingerprint: doc.fingerprint,
    severity: doc.severity,
    status: doc.status,
    title: doc.title,
    summary: doc.summary,
    evidence: (doc.evidence ?? []).map((e) => ({
      type: e.type,
      id: e.id,
      label: e.label,
      amountMinor: e.amountMinor,
    })),
    inputVersion: doc.inputVersion,
    firstSeenAt:
      doc.firstSeenAt instanceof Date
        ? doc.firstSeenAt.toISOString()
        : String(doc.firstSeenAt),
    lastSeenAt:
      doc.lastSeenAt instanceof Date
        ? doc.lastSeenAt.toISOString()
        : String(doc.lastSeenAt),
    resolvedAt: doc.resolvedAt
      ? doc.resolvedAt instanceof Date
        ? doc.resolvedAt.toISOString()
        : String(doc.resolvedAt)
      : null,
  };
}

export interface UpsertResult {
  alert: AlertDto;
  isNew: boolean;
}

export const alertsRepository = {
  /**
   * Upserts a candidate alert by (tenantId, fingerprint).
   * Identifies whether this is a newly raised alert (or reopened) vs. an existing open alert.
   */
  async upsertCandidate(
    tenantId: string,
    candidate: CandidateAlert,
    inputVersion?: number,
    session?: ClientSession,
  ): Promise<UpsertResult> {
    const existing = await AlertModel.findOne({
      tenantId,
      fingerprint: candidate.fingerprint,
    })
      .session(session ?? null);

    const now = new Date();

    if (!existing) {
      const created = await AlertModel.create(
        [
          {
            tenantId,
            ruleId: candidate.ruleId,
            fingerprint: candidate.fingerprint,
            severity: candidate.severity,
            status: 'open',
            title: candidate.title,
            summary: candidate.summary,
            evidence: candidate.evidence,
            inputVersion,
            firstSeenAt: now,
            lastSeenAt: now,
            resolvedAt: null,
          },
        ],
        { session },
      );

      return {
        alert: toDto(created[0] as unknown as AlertDoc),
        isNew: true,
      };
    }

    const wasResolved = existing.status === 'resolved';
    existing.status = 'open';
    existing.resolvedAt = null;
    existing.lastSeenAt = now;
    existing.severity = candidate.severity;
    existing.title = candidate.title;
    existing.summary = candidate.summary;
    existing.evidence = candidate.evidence;
    if (inputVersion !== undefined) {
      existing.inputVersion = inputVersion;
    }

    const saved = await existing.save({ session });
    return {
      alert: toDto(saved as unknown as AlertDoc),
      isNew: wasResolved,
    };
  },

  /**
   * Retrieves all currently open alerts for a tenant.
   */
  async findOpen(
    tenantId: string,
    session?: ClientSession,
  ): Promise<AlertDto[]> {
    const docs = await AlertModel.find({ tenantId, status: 'open' })
      .session(session ?? null)
      .lean();

    return docs.map((doc) => toDto(doc as unknown as AlertDoc));
  },

  /**
   * Marks open alerts matching the given fingerprints as resolved.
   */
  async markResolved(
    tenantId: string,
    fingerprints: string[],
    session?: ClientSession,
  ): Promise<AlertDto[]> {
    if (fingerprints.length === 0) {
      return [];
    }

    const now = new Date();
    const docs = await AlertModel.find({
      tenantId,
      status: 'open',
      fingerprint: { $in: fingerprints },
    }).session(session ?? null);

    const resolved: AlertDto[] = [];
    for (const doc of docs) {
      doc.status = 'resolved';
      doc.resolvedAt = now;
      const saved = await doc.save({ session });
      resolved.push(toDto(saved as unknown as AlertDoc));
    }

    return resolved;
  },

  /**
   * Lists alerts for a tenant with optional status filter.
   */
  async list(
    tenantId: string,
    filter?: { status?: AlertStatus },
    session?: ClientSession,
  ): Promise<AlertDto[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filter?.status) {
      query.status = filter.status;
    }

    const docs = await AlertModel.find(query)
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .lean();

    return docs.map((doc) => toDto(doc as unknown as AlertDoc));
  },

  /**
   * Retrieves a single alert by ID ensuring tenant isolation.
   */
  async findById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<AlertDto | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await AlertModel.findOne({
      tenantId,
      _id: new Types.ObjectId(id),
    })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as AlertDoc) : null;
  },
};
