import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type { LedgerEntryDto, LedgerQuery, LedgerCategory, LedgerEntryKind } from '@harbor/contracts';
import { LedgerEntryModel, type LedgerEntryDoc } from './ledger.model';

function toDto(doc: LedgerEntryDoc): LedgerEntryDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    accountCode: doc.accountCode,
    externalId: doc.externalId,
    bookedOn: doc.bookedOn,
    amountMinor: doc.amountMinor,
    currency: 'CNY',
    category: doc.category,
    description: doc.description ?? '',
    counterpartyExternalId: doc.counterpartyExternalId,
    invoiceExternalId: doc.invoiceExternalId,
    kind: doc.kind,
    sourceImportId: doc.sourceImportId ? String(doc.sourceImportId) : undefined,
    operationId: doc.operationId,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface UpsertLedgerEntryData {
  accountCode: string;
  externalId: string;
  bookedOn: string;
  amountMinor: number;
  currency?: 'CNY';
  category: LedgerCategory;
  description?: string;
  counterpartyExternalId?: string;
  invoiceExternalId?: string;
  kind?: LedgerEntryKind;
  sourceImportId?: string;
  operationId?: string;
}

export const ledgerRepository = {
  async list(
    tenantId: string,
    query: LedgerQuery,
    session?: ClientSession,
  ): Promise<{ items: LedgerEntryDto[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const filter: Record<string, unknown> = { tenantId };

    if (query.from || query.to) {
      const dateFilter: Record<string, string> = {};
      if (query.from) dateFilter.$gte = query.from;
      if (query.to) dateFilter.$lte = query.to;
      filter.bookedOn = dateFilter;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.accountCode) {
      filter.accountCode = query.accountCode;
    }

    const [total, docs] = await Promise.all([
      LedgerEntryModel.countDocuments(filter).session(session ?? null),
      LedgerEntryModel.find(filter)
        .sort({ bookedOn: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize)
        .session(session ?? null)
        .lean(),
    ]);

    return {
      items: docs.map((doc) => toDto(doc as unknown as LedgerEntryDoc)),
      total,
    };
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertLedgerEntryData[],
    session?: ClientSession,
  ): Promise<void> {
    if (items.length === 0) return;

    const ops = items.map((item) => ({
      updateOne: {
        filter: {
          tenantId,
          accountCode: item.accountCode,
          externalId: item.externalId,
        },
        update: {
          $set: {
            bookedOn: item.bookedOn,
            amountMinor: item.amountMinor,
            currency: item.currency ?? 'CNY',
            category: item.category,
            description: item.description ?? '',
            counterpartyExternalId: item.counterpartyExternalId,
            invoiceExternalId: item.invoiceExternalId,
            kind: item.kind ?? 'imported',
            sourceImportId: item.sourceImportId ? new Types.ObjectId(item.sourceImportId) : undefined,
            operationId: item.operationId,
          },
          $setOnInsert: {
            tenantId,
            accountCode: item.accountCode,
            externalId: item.externalId,
          },
        },
        upsert: true,
      },
    }));

    await LedgerEntryModel.bulkWrite(ops, { session });
  },

  async findEntriesForCashCalculation(
    tenantId: string,
    accountCode: string,
    afterDate: string,
    upToDate: string,
    session?: ClientSession,
  ): Promise<{ amountMinor: number }[]> {
    return LedgerEntryModel.find({
      tenantId,
      accountCode,
      bookedOn: { $gt: afterDate, $lte: upToDate },
    })
      .select({ amountMinor: 1, _id: 0 })
      .session(session ?? null)
      .lean();
  },

  async deleteByImportId(
    tenantId: string,
    importId: string,
    session?: ClientSession,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(importId)) {
      return 0;
    }
    const result = await LedgerEntryModel.deleteMany({
      tenantId,
      sourceImportId: new Types.ObjectId(importId),
    }).session(session ?? null);
    return result.deletedCount ?? 0;
  },
};

