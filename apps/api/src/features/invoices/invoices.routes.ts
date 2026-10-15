import { Router } from 'express';
import { invoicesQuerySchema } from '@harbor/contracts';
import { protect } from '../auth/index.js';
import { validate } from '../../core/http/validate.js';
import { invoicesController } from './invoices.controller.js';

export const invoicesRouter: Router = Router();

invoicesRouter.get(
  '/',
  protect('finance:read'),
  validate({ query: invoicesQuerySchema }),
  invoicesController.list,
);

