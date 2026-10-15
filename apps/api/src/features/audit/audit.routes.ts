import { Router } from 'express';
import { auditQuerySchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { auditController } from './audit.controller';

const router = Router();

// GET /api/v1/audit-events
router.get(
  '/',
  ...protect('audit:export'),
  validate({ query: auditQuerySchema }),
  auditController.list,
);

export const auditRouter: Router = router;
