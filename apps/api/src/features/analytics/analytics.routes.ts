import { Router } from 'express';
import { protect } from '../auth';
import { analyticsController } from './analytics.controller';

export const analyticsRouter: Router = Router();

analyticsRouter.get(
  '/summary',
  protect('finance:read'),
  analyticsController.getSummary,
);

analyticsRouter.get(
  '/health-score',
  protect('finance:read'),
  analyticsController.getHealthScore,
);

analyticsRouter.get(
  '/health',
  protect('finance:read'),
  analyticsController.getHealthScore,
);
