import mongoose, { type Model } from 'mongoose';
import type {
  ImportKind,
  ImportStatus,
  ImportErrorItem,
  NormalizedTransactionRow,
  NormalizedInvoiceRow,
} from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface ImportDoc {
  id?: string;
  tenantId: string;
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
  committedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const importErrorSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true },
    field: { type: String, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
);

const importSchema = createSchema<ImportDoc>({
  tenantId: { type: String, required: true },
  kind: { type: String, required: true, enum: ['transactions', 'invoices'] },
  fileName: { type: String, required: true },
  checksum: { type: String, required: true },
  mappingVersion: { type: Number, required: true, default: 1 },
  status: {
    type: String,
    required: true,
    enum: ['previewed', 'committed', 'rejected', 'expired'],
    default: 'previewed',
  },
  rowCount: { type: Number, required: true, default: 0 },
  acceptedRows: { type: Number, required: true, default: 0 },
  rejectedRows: { type: Number, required: true, default: 0 },
  errors: { type: [importErrorSchema], required: true, default: [] },
  stagedRows: { type: [mongoose.Schema.Types.Mixed], required: false },
  actorId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  committedAt: { type: Date, required: false },
}, { suppressReservedKeysWarning: true });

// Partial unique index: re-upload of same file version committed once per tenant
importSchema.index(
  { tenantId: 1, kind: 1, checksum: 1, mappingVersion: 1 },
  { unique: true, partialFilterExpression: { status: 'committed' } },
);

// TTL index on expiresAt (MongoDB removes documents whose expiresAt < Date.now())
importSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// History index per DB_SCHEMA.md
importSchema.index({ tenantId: 1, createdAt: -1 });

export const ImportModel: Model<ImportDoc> =
  mongoose.models.Import || mongoose.model<ImportDoc>('Import', importSchema, 'imports');
