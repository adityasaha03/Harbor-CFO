import { Router } from 'express';
import { asyncHandler } from '../../../core/http/async-handler';
import { authenticate, tenantContext, requirePermission } from '../../auth';
import { proofController } from './proof.controller';

export const proofRouter: Router = Router();

proofRouter.use(authenticate, tenantContext, requirePermission('finance:read'));

proofRouter.get('/checks', asyncHandler(proofController.getCatalog));
proofRouter.post('/checks/:id/run', asyncHandler(proofController.runCheck));
