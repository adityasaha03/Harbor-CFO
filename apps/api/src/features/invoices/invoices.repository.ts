import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type { InvoiceDirection, InvoiceStatus } from '@harbor/contracts';
import { InvoiceModel, type InvoiceDoc } from './invoices.model.js';

export interface UpsertInvoiceData {
  externalId: string;
  direction: InvoiceDirection;
  counterpartyExternalId: string;
  totalMinor: number;
  outstandingMinor: number;
  currency?: 'CNY';
  issuedOn?: string;
  dueOn: string;
  expectedSettlementOn: string;
  status: InvoiceStatus;
  description?: string;
  sourceImportId?: string;
}

export const invoicesRepository = {
  async findByExternalId(
    tenantId: string,
    externalId: string,
    session?: ClientSession,
  ): Promise<InvoiceDoc | null> {
    const doc = await InvoiceModel.findOne({ tenantId, externalId })
      .session(session ?? null)
      .lean();
    return doc ? (doc as unknown as InvoiceDoc) : null;
  },

  async list(
    tenantId: string,
    filter?: { direction?: InvoiceDirection; status?: InvoiceStatus },
    session?: ClientSession,
  ): Promise<InvoiceDoc[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filter?.direction) query.direction = filter.direction;
    if (filter?.status) query.status = filter.status;

    const docs = await InvoiceModel.find(query)
      .sort({ expectedSettlementOn: 1, _id: 1 })
      .session(session ?? null)
      .lean();
    return docs as unknown as InvoiceDoc[];
  },

  async listOutstanding(tenantId: string, session?: ClientSession): Promise<InvoiceDoc[]> {
    const docs = await InvoiceModel.find({
      tenantId,
      status: { $in: ['open', 'partially_paid'] },
      outstandingMinor: { $gt: 0 },
    })
      .sort({ expectedSettlementOn: 1, _id: 1 })
      .session(session ?? null)
      .lean();
    return docs as unknown as InvoiceDoc[];
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertInvoiceData[],
    session?: ClientSession,
  ): Promise<{ upsertedCount: number; modifiedCount: number }> {
    if (items.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { tenantId, externalId: item.externalId },
        update: {
          $set: {
            direction: item.direction,
            counterpartyExternalId: item.counterpartyExternalId,
            totalMinor: item.totalMinor,
            outstandingMinor: item.outstandingMinor,
            currency: item.currency ?? 'CNY',
            issuedOn: item.issuedOn,
            dueOn: item.dueOn,
            expectedSettlementOn: item.expectedSettlementOn,
            status: item.status,
            description: item.description,
            ...(item.sourceImportId ? { sourceImportId: new Types.ObjectId(item.sourceImportId) } : {}),
          },
          $setOnInsert: {
            tenantId,
            externalId: item.externalId,
          },
        },
        upsert: true,
      },
    }));

    const result = await InvoiceModel.bulkWrite(operations, { session, ordered: false });
    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
    };
  },
};

