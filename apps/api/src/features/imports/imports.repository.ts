import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type {
  ImportDto,
  ImportKind,
  ImportStatus,
  ImportErrorItem,
  ImportsQuery,
  NormalizedTransactionRow,
  NormalizedInvoiceRow,
} from '@harbor/contracts';
import { ImportModel, type ImportDoc } from './imports.model';

function toDto(doc: ImportDoc): ImportDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    kind: doc.kind,
    fileName: doc.fileName,
    checksum: doc.checksum,
    mappingVersion: doc.mappingVersion,
    status: doc.status,
    rowCount: doc.rowCount,
    acceptedRows: doc.acceptedRows,
    rejectedRows: doc.rejectedRows,
    errors: doc.errors ?? [],
    actorId: doc.actorId,
    expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : String(doc.expiresAt),
    committedAt: doc.committedAt
      ? doc.committedAt instanceof Date
        ? doc.committedAt.toISOString()
        : String(doc.committedAt)
      : undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface CreateImportData {
  kind: ImportKind;
  fileName: string;
  checksum: string;
  mappingVersion: number;
  status: ImportStatus;
  rowCount: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: ImportErrorItem[];
  stagedRows?: (NormalizedTransactionRow | NormalizedInvoiceRow)[];
  actorId: string;
  expiresAt: Date;
}

export type ImportRecordWithStaged = ImportDto & {
  stagedRows?: (NormalizedTransactionRow | NormalizedInvoiceRow)[];
};

export const importsRepository = {
  async create(
    tenantId: string,
    data: CreateImportData,
    session?: ClientSession,
  ): Promise<ImportDto> {
    const docs = await ImportModel.create(
      [
        {
          tenantId,
          kind: data.kind,
          fileName: data.fileName,
          checksum: data.checksum,
          mappingVersion: data.mappingVersion,
          status: data.status,
          rowCount: data.rowCount,
          acceptedRows: data.acceptedRows,
          rejectedRows: data.rejectedRows,
          errors: data.errors,
          stagedRows: data.stagedRows,
          actorId: data.actorId,
          expiresAt: data.expiresAt,
        },
      ],
      { session },
    );

    return toDto(docs[0] as unknown as ImportDoc);
  },

  async findById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ImportDto | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await ImportModel.findOne({ tenantId, _id: new Types.ObjectId(id) })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as ImportDoc) : null;
  },

  async findByIdWithStaged(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ImportRecordWithStaged | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await ImportModel.findOne({ tenantId, _id: new Types.ObjectId(id) })
      .session(session ?? null)
      .lean();

    if (!doc) {
      return null;
    }

    const typedDoc = doc as unknown as ImportDoc;
    return {
      ...toDto(typedDoc),
      stagedRows: typedDoc.stagedRows,
    };
  },

  async findCommittedByChecksum(
    tenantId: string,
    kind: ImportKind,
    checksum: string,
    mappingVersion: number,
    session?: ClientSession,
  ): Promise<ImportDto | null> {
    const doc = await ImportModel.findOne({
      tenantId,
      kind,
      checksum,
      mappingVersion,
      status: 'committed',
    })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as ImportDoc) : null;
  },

  async markCommitted(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ImportDto | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await ImportModel.findOneAndUpdate(
      { tenantId, _id: new Types.ObjectId(id) },
      {
        $set: {
          status: 'committed',
          committedAt: new Date(),
        },
        $unset: {
          stagedRows: '',
        },
      },
      { new: true, session },
    ).lean();

    return doc ? toDto(doc as unknown as ImportDoc) : null;
  },

  async list(
    tenantId: string,
    query: ImportsQuery,
    session?: ClientSession,
  ): Promise<{ items: ImportDto[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const filter: Record<string, unknown> = { tenantId };
    if (query.kind) {
      filter.kind = query.kind;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [total, docs] = await Promise.all([
      ImportModel.countDocuments(filter).session(session ?? null),
      ImportModel.find(filter)
        .select({ stagedRows: 0 })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize)
        .session(session ?? null)
        .lean(),
    ]);

    return {
      items: docs.map((doc) => toDto(doc as unknown as ImportDoc)),
      total,
    };
  },
};
