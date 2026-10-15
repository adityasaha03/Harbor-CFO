import type { ClientSession } from 'mongoose';
import type { EventDto, PublishEventInput } from '@harbor/contracts';
import { EventModel, EventCounterModel } from './events.model';

export const eventsRepository = {
  /**
   * Atomically increments and returns the next sequence number for a tenant.
   * Guarantees strictly increasing gap-free sequence per tenant.
   */
  async nextSequence(tenantId: string, session?: ClientSession): Promise<number> {
    const counter = await EventCounterModel.findOneAndUpdate(
      { tenantId },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session },
    );

    return counter.sequence;
  },

  /**
   * Inserts a single event with the assigned sequence.
   */
  async create(
    tenantId: string,
    sequence: number,
    input: PublishEventInput,
    session?: ClientSession,
  ): Promise<EventDto> {
    const docs = await EventModel.create(
      [
        {
          tenantId,
          sequence,
          kind: input.kind,
          publicSummary: input.publicSummary,
          resourceRefs: input.resourceRefs ?? [],
          runId: input.runId,
        },
      ],
      { session },
    );

    const doc = docs[0];
    if (!doc) {
      throw new Error('Failed to create event document');
    }
    return {
      id: String(doc._id),
      tenantId: doc.tenantId,
      sequence: doc.sequence,
      kind: doc.kind,
      publicSummary: doc.publicSummary,
      resourceRefs: doc.resourceRefs,
      runId: doc.runId,
      createdAt: doc.createdAt.toISOString(),
    };
  },

  /**
   * Returns persisted events strictly after the given sequence, ordered chronologically.
   */
  async listAfter(
    tenantId: string,
    afterSequence: number,
    limit: number,
  ): Promise<EventDto[]> {
    const boundedLimit = Math.min(Math.max(1, limit), 200);

    const docs = await EventModel.find({
      tenantId,
      sequence: { $gt: afterSequence },
    })
      .sort({ sequence: 1 })
      .limit(boundedLimit)
      .lean();

    return docs.map((doc) => ({
      id: String(doc._id),
      tenantId: doc.tenantId,
      sequence: doc.sequence,
      kind: doc.kind,
      publicSummary: doc.publicSummary,
      resourceRefs: doc.resourceRefs ?? [],
      runId: doc.runId,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    }));
  },
};
