import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { liveHandler, readyHandler } from './health.controller';

const router = Router();

router.get('/live', liveHandler);
router.get('/ready', asyncHandler(readyHandler));

export const healthRouter = router;
