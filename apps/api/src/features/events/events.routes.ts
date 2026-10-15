import { Router } from 'express';
import { eventsReplayQuerySchema, eventsStreamQuerySchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { eventsController } from './events.controller';

const router = Router();

// GET /api/v1/events/stream (Server-Sent Events)
router.get(
  '/stream',
  ...protect('finance:read'),
  validate({ query: eventsStreamQuerySchema }),
  eventsController.stream,
);

// GET /api/v1/events (REST replay)
router.get(
  '/',
  ...protect('finance:read'),
  validate({ query: eventsReplayQuerySchema }),
  eventsController.replay,
);

export const eventsRouter: Router = router;
