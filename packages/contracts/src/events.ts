import { z } from 'zod';

export const EVENT_KINDS = [
  'import.committed',
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

export const domainEventSchema = z.object({
  id: z.string(),
  event: eventKindSchema,
  tenantId: z.string(),
  data: z.record(z.unknown()),
  timestamp: z.string(),
});

export type DomainEvent = z.infer<typeof domainEventSchema>;
