import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { minorSchema } from './common/money';

// ---------------------------------------------------------------------------
// Weekly Briefing Schemas & Types (B19 P1)
// ---------------------------------------------------------------------------

export const briefingMetricsSchema = z.object({
  currentCashMinor: minorSchema,
  minCashMinor: minorSchema,
  minCashDate: dateOnlySchema,
  floorMinor: minorSchema,
  liquidityGapMinor: minorSchema,
  openAlertsCount: z.number().int().nonnegative(),
  criticalAlertsCount: z.number().int().nonnegative(),
  overdueArMinor: minorSchema,
  healthScore: z.number().int().min(0).max(100),
});
export type BriefingMetrics = z.infer<typeof briefingMetricsSchema>;

export const briefingSectionsSchema = z.object({
  whatHappened: z.string().min(1),
  whatMatters: z.string().min(1),
  whatToDoNext: z.string().min(1),
});
export type BriefingSections = z.infer<typeof briefingSectionsSchema>;

export const weeklyBriefingResponseSchema = z.object({
  tenantId: z.string().min(1),
  asOfDate: dateOnlySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: briefingSectionsSchema,
  metrics: briefingMetricsSchema,
  generatedAt: z.string(),
});
export type WeeklyBriefingResponse = z.infer<typeof weeklyBriefingResponseSchema>;
