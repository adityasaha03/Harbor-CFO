import mongoose, { type Model } from 'mongoose';
import type { EventKind } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface EventDoc {
  id?: string;
  tenantId: string;
  sequence: number;
  kind: EventKind;
  publicSummary: string;
  resourceRefs: string[];
  runId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = createSchema<EventDoc>({
  tenantId: { type: String, required: true },
  sequence: { type: Number, required: true },
  kind: { type: String, required: true },
  publicSummary: { type: String, required: true },
  resourceRefs: { type: [String], default: [] },
  runId: { type: String, required: false },
});

// Unique index: sequence is unique per tenant
eventSchema.index({ tenantId: 1, sequence: 1 }, { unique: true });

// TTL index: expire events after 7 days (604,800 seconds)
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const EventModel: Model<EventDoc> =
  mongoose.models.Event || mongoose.model<EventDoc>('Event', eventSchema, 'events');

export interface EventCounterDoc {
  tenantId: string;
  sequence: number;
}

const eventCounterSchema = createSchema<EventCounterDoc>({
  tenantId: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
});

eventCounterSchema.index({ tenantId: 1 }, { unique: true });

export const EventCounterModel: Model<EventCounterDoc> =
  mongoose.models.EventCounter ||
  mongoose.model<EventCounterDoc>('EventCounter', eventCounterSchema, 'eventCounters');

