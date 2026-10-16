import { Router } from 'express';
import { financingMatchQuerySchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { financingController } from './financing.controller';

export const financingRouter: Router = Router();

financingRouter.get(
  '/offers',
  protect('finance:read'),
  financingController.listOffers,
);

financingRouter.post(
  '/match',
  protect('finance:read'),
  validate({ body: financingMatchQuerySchema }),
  financingController.matchFinancing,
);
