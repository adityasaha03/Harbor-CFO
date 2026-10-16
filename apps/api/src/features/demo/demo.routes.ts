import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { authenticate, tenantContext, requirePermission } from '../auth';
import { demoController } from './demo.controller';

export const demoRouter: Router = Router();

demoRouter.post(
  '/reset',
  authenticate,
  tenantContext,
  requirePermission('settings:manage'),
  asyncHandler(demoController.reset),
);
