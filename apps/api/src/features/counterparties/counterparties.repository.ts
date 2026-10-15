import type { ClientSession } from 'mongoose';
import type { CounterpartyDto, CounterpartyType } from '@harbor/contracts';
import { CounterpartyModel, type CounterpartyDoc } from './counterparties.model';

function toDto(doc: CounterpartyDoc): CounterpartyDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    externalId: doc.externalId,
    type: doc.type,
    name: doc.name,
    maskedName: doc.maskedName,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface UpsertCounterpartyData {
  externalId: string;
  type: CounterpartyType;
  name: string;
  maskedName?: string;
}

export const counterpartiesRepository = {
  async findByExternalId(
    tenantId: string,
    externalId: string,
    session?: ClientSession,
  ): Promise<CounterpartyDto | null> {
    const doc = await CounterpartyModel.findOne({ tenantId, externalId })
      .session(session ?? null)
      .lean();
    return doc ? toDto(doc as unknown as CounterpartyDoc) : null;
  },

  async list(tenantId: string, session?: ClientSession): Promise<CounterpartyDto[]> {
    const docs = await CounterpartyModel.find({ tenantId })
      .sort({ externalId: 1 })
      .session(session ?? null)
      .lean();
    return docs.map((doc) => toDto(doc as unknown as CounterpartyDoc));
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertCounterpartyData[],
    session?: ClientSession,
  ): Promise<void> {
    if (items.length === 0) return;

    const ops = items.map((item) => {
      const masked = item.maskedName ?? item.name;
      return {
        updateOne: {
          filter: { tenantId, externalId: item.externalId },
          update: {
            $set: {
              type: item.type,
              name: item.name,
              maskedName: masked,
            },
            $setOnInsert: { tenantId, externalId: item.externalId },
          },
          upsert: true,
        },
      };
    });

    await CounterpartyModel.bulkWrite(ops, { session });
  },

  async ensureCounterparty(
    tenantId: string,
    externalId: string,
    type: CounterpartyType,
    maskedName?: string,
    session?: ClientSession,
  ): Promise<CounterpartyDto> {
    const fallbackMasked = maskedName ?? (type === 'customer' ? `Customer ${externalId}` : `Vendor ${externalId}`);
    const doc = await CounterpartyModel.findOneAndUpdate(
      { tenantId, externalId },
      {
        $setOnInsert: {
          tenantId,
          externalId,
          type,
          name: externalId,
          maskedName: fallbackMasked,
        },
      },
      { upsert: true, new: true, session },
    ).lean();

    return toDto(doc as unknown as CounterpartyDoc);
  },
};

