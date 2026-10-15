import { z } from 'zod';

export const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'info'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export const alertSeveritySchema = z.enum(ALERT_SEVERITIES);

export const ALERT_STATUSES = ['open', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export const alertStatusSchema = z.enum(ALERT_STATUSES);

export const ALERT_RULES = [
  'negative_cash',
  'floor_breach',
  'overdue_receivable',
  'customer_concentration',
  'repayment_pressure',
  'stale_data',
] as const;
export type AlertRule = (typeof ALERT_RULES)[number];
export const alertRuleSchema = z.enum(ALERT_RULES);

export const alertEvidenceItemSchema = z.object({
  type: z.string(),
  id: z.string(),
  label: z.string(),
  amountMinor: z.number().int().optional(),
});

export type AlertEvidenceItem = z.infer<typeof alertEvidenceItemSchema>;

export const alertSchema = z.object({
  id: z.string(),
  ruleId: alertRuleSchema,
  fingerprint: z.string().optional(),
  severity: alertSeveritySchema,
  status: alertStatusSchema,
  title: z.string(),
  summary: z.string(),
  evidence: z.array(alertEvidenceItemSchema).default([]),
  inputVersion: z.number().int().optional(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
});

export type Alert = z.infer<typeof alertSchema>;
