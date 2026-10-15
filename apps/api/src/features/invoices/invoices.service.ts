import type { ClientSession } from 'mongoose';
import type { InvoiceDto, InvoicesQuery } from '@harbor/contracts';
import { tenantsService } from '../tenants/index.js';
import { invoicesRepository, type UpsertInvoiceData } from './invoices.repository.js';
import type { InvoiceDoc } from './invoices.model.js';

function toDto(doc: InvoiceDoc, asOf: string): InvoiceDto {
  const isOverdue = doc.dueOn < asOf && doc.outstandingMinor > 0;
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    externalId: doc.externalId,
    direction: doc.direction,
    counterpartyExternalId: doc.counterpartyExternalId,
    totalMinor: doc.totalMinor,
    outstandingMinor: doc.outstandingMinor,
    currency: 'CNY',
    issuedOn: doc.issuedOn,
    dueOn: doc.dueOn,
    expectedSettlementOn: doc.expectedSettlementOn,
    status: doc.status,
    description: doc.description,
    sourceImportId: doc.sourceImportId ? String(doc.sourceImportId) : undefined,
    isOverdue,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const invoicesService = {
  async list(tenantId: string, query: InvoicesQuery = {}): Promise<InvoiceDto[]> {
    const asOf = await tenantsService.getForecastAsOf(tenantId);
    const docs = await invoicesRepository.list(tenantId, {
      direction: query.direction,
      status: query.status,
    });

    const dtos = docs.map((doc) => toDto(doc, asOf));

    if (query.overdue !== undefined) {
      return dtos.filter((inv) => inv.isOverdue === query.overdue);
    }

    return dtos;
  },

  async listOutstanding(tenantId: string, session?: ClientSession): Promise<InvoiceDto[]> {
    const asOf = await tenantsService.getForecastAsOf(tenantId);
    const docs = await invoicesRepository.listOutstanding(tenantId, session);
    return docs.map((doc) => toDto(doc, asOf));
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertInvoiceData[],
    session?: ClientSession,
  ): Promise<{ upsertedCount: number; modifiedCount: number }> {
    return invoicesRepository.bulkUpsert(tenantId, items, session);
  },
};
