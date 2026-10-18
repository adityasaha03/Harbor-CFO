import { z } from 'zod';

export const EVENT_KINDS = [
  'import.committed',
  'import.deleted',
  'forecast.updated',
  'alert.raised',
  'alert.resolved',
  'tool.started',
  'tool.completed',
  'proposal.created',
  'approval.required',
  'action.committed',
  'run.completed',
  'run.failed',
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const eventKindSchema = z.enum(EVENT_KINDS);

export const eventDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sequence: z.number().int().positive(),
  kind: eventKindSchema,
  publicSummary: z.string(),
  resourceRefs: z.array(z.string()).default([]),
  runId: z.string().optional(),
  createdAt: z.string(),
});
export type EventDto = z.infer<typeof eventDtoSchema>;

export const publishEventInputSchema = z.object({
  kind: eventKindSchema,
  publicSummary: z.string().min(1).max(1000),
  resourceRefs: z.array(z.string()).default([]),
  runId: z.string().optional(),
});
export type PublishEventInput = z.input<typeof publishEventInputSchema>;

export const eventsReplayQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type EventsReplayQuery = z.input<typeof eventsReplayQuerySchema>;

export const eventsStreamQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().optional(),
});
export type EventsStreamQuery = z.input<typeof eventsStreamQuerySchema>;

// Backward compatibility with initial stub
export const domainEventSchema = z.object({
  id: z.string(),
  event: eventKindSchema,
  tenantId: z.string(),
  data: z.record(z.unknown()),
  timestamp: z.string(),
});
export type DomainEvent = z.infer<typeof domainEventSchema>;
