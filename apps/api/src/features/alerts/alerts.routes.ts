import { Router } from 'express';
import { protect } from '../auth';
import { alertsController } from './alerts.controller';

const router = Router();

// GET /api/v1/alerts (finance:read)
router.get('/', ...protect('finance:read'), alertsController.list);

// GET /api/v1/alerts/:id (finance:read)
router.get('/:id', ...protect('finance:read'), alertsController.getById);

export const alertsRouter: Router = router;
