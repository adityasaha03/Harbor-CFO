import { Router } from 'express';
import {
  forecastDayParamSchema,
  forecastIdParamSchema,
} from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { forecastController } from './forecast.controller';

export const forecastsRouter: Router = Router();

forecastsRouter.get(
  '/latest',
  protect('finance:read'),
  forecastController.getLatest,
);

forecastsRouter.get(
  '/latest/days/:date',
  protect('finance:read'),
  validate({ params: forecastDayParamSchema }),
  forecastController.getDayDrilldown,
);

forecastsRouter.get(
  '/:id',
  protect('finance:read'),
  validate({ params: forecastIdParamSchema }),
  forecastController.getById,
);
