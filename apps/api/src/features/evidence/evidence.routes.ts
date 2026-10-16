import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { authenticate, tenantContext, requirePermission } from '../auth';
import { evidenceController } from './evidence.controller';

export const evidenceRouter: Router = Router();

evidenceRouter.get(
  '/export',
  authenticate,
  tenantContext,
  requirePermission('audit:export'),
  asyncHandler(evidenceController.export),
);
