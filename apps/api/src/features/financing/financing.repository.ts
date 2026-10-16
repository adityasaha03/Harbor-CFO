import type { ClientSession } from 'mongoose';
import type { FinancingOffer } from '@harbor/contracts';
import { FinancingOfferModel, type FinancingOfferDoc } from './financing.model';
import { SYNTHETIC_OFFERS } from './catalog/offers';

function toDto(doc: FinancingOfferDoc): FinancingOffer {
  return {
    code: doc.code,
    version: doc.version,
    synthetic: true,
    type: doc.type,
    name: doc.name,
    description: doc.description,
    currency: 'CNY',
    minAmountMinor: doc.minAmountMinor,
    maxAmountMinor: doc.maxAmountMinor,
    dynamicCap: doc.dynamicCap,
    fundingDelayDays: doc.fundingDelayDays,
    upfrontFeeBps: doc.upfrontFeeBps,
    flatInterestBps: doc.flatInterestBps,
    installments: {
      count: doc.installments.count,
      firstDueAfterFundingDays: doc.installments.firstDueAfterFundingDays,
      intervalDays: doc.installments.intervalDays,
    },
    eligiblePurposes: doc.eligiblePurposes,
    requiresInvoiceEvidence: doc.requiresInvoiceEvidence,
    requiredProfileFields: doc.requiredProfileFields,
    ...(doc.minYearsInOperation !== undefined
      ? { minYearsInOperation: doc.minYearsInOperation }
      : {}),
  };
}

export const financingRepository = {
  /**
   * Idempotently seeds the 6 synthetic financing offers into the database.
   */
  async seedFinancingOffers(
    offers: FinancingOffer[] = SYNTHETIC_OFFERS,
    session?: ClientSession,
  ): Promise<number> {
    const ops = offers.map((offer) => ({
      updateOne: {
        filter: { code: offer.code, version: offer.version },
        update: { $set: offer },
        upsert: true,
      },
    }));

    if (ops.length === 0) return 0;
    const result = await FinancingOfferModel.bulkWrite(ops, { session: session ?? undefined });
    return result.upsertedCount + result.matchedCount;
  },

  /**
   * Lists all available financing offers in the catalog.
   */
  async listCatalog(session?: ClientSession): Promise<FinancingOffer[]> {
    const docs = await FinancingOfferModel.find({})
      .sort({ code: 1 })
      .session(session ?? null)
      .lean();

    if (docs.length === 0) {
      // If DB is not yet seeded, return synthetic catalog directly
      return SYNTHETIC_OFFERS;
    }

    return docs.map((d) => toDto(d as unknown as FinancingOfferDoc));
  },

  /**
   * Finds a financing offer by code and version.
   */
  async findByCode(
    code: string,
    version = 1,
    session?: ClientSession,
  ): Promise<FinancingOffer | null> {
    const doc = await FinancingOfferModel.findOne({ code, version })
      .session(session ?? null)
      .lean();

    if (doc) {
      return toDto(doc as unknown as FinancingOfferDoc);
    }

    const fallback = SYNTHETIC_OFFERS.find(
      (offer) => offer.code === code && offer.version === version,
    );
    return fallback ?? null;
  },
};

export const seedFinancingOffers = financingRepository.seedFinancingOffers.bind(financingRepository);
export const listCatalog = financingRepository.listCatalog.bind(financingRepository);
export const findByCode = financingRepository.findByCode.bind(financingRepository);
