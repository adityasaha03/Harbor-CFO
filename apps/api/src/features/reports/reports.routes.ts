import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { reportsController } from './reports.controller';

export const reportsRouter: Router = Router();

const cashSummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
  format: z.enum(['csv', 'pdf', 'CSV', 'PDF']).optional(),
});

reportsRouter.get(
  '/cash-summary',
  protect('finance:read'),
  validate({ query: cashSummaryQuerySchema }),
  reportsController.getCashSummary,
);
