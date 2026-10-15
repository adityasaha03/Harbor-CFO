import { Router } from 'express';
import { createCommitmentSchema, updateCommitmentSchema } from '@harbor/contracts';
import { protect } from '../auth/index.js';
import { validate } from '../../core/http/validate.js';
import { commitmentsController } from './commitments.controller.js';

export const commitmentsRouter: Router = Router();

commitmentsRouter.get(
  '/',
  protect('finance:read'),
  commitmentsController.list,
);

commitmentsRouter.post(
  '/',
  protect('settings:manage'),
  validate({ body: createCommitmentSchema }),
  commitmentsController.create,
);

commitmentsRouter.patch(
  '/:id',
  protect('settings:manage'),
  validate({ body: updateCommitmentSchema }),
  commitmentsController.update,
);

commitmentsRouter.delete(
  '/:id',
  protect('settings:manage'),
  commitmentsController.delete,
);

