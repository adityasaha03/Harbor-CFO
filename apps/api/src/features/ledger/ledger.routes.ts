import { Router } from 'express';
import { ledgerQuerySchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { ledgerController } from './ledger.controller';

const router = Router();

// GET /api/v1/ledger-entries (finance:read)
router.get(
  '/',
  ...protect('finance:read'),
  validate({ query: ledgerQuerySchema }),
  ledgerController.list,
);

export const ledgerEntriesRouter: Router = router;

