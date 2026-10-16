import { Router } from 'express';
import { protect } from '../auth';
import { briefingsController } from './briefings.controller';

export const briefingsRouter: Router = Router();

briefingsRouter.get(
  '/latest',
  protect('finance:read'),
  briefingsController.getLatest,
);
