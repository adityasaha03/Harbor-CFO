import { Router } from 'express';
import { protect } from '../auth';
import { accountsController } from './accounts.controller';

const router = Router();

// GET /api/v1/accounts (finance:read)
router.get('/', ...protect('finance:read'), accountsController.list);

export const accountsRouter: Router = router;

