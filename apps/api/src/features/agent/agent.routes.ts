import { Router } from 'express';
import { z } from 'zod';
import {
  createAgentRunInputSchema,
  agentRunsQuerySchema,
} from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { createRateLimiter } from '../../core/security/rate-limit';
import { agentController } from './agent.controller';

export const agentRouter: Router = Router();

const agentRunRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
});

const runIdParamSchema = z.object({
  id: z.string().min(1),
});

// POST /api/v1/agent/runs (agent:use, rate limit 10/min per user, max 2 concurrent runs per tenant -> 429)
agentRouter.post(
  '/runs',
  protect('agent:use'),
  agentRunRateLimiter,
  validate({ body: createAgentRunInputSchema }),
  agentController.createRun,
);

// GET /api/v1/agent/runs (finance:read)
agentRouter.get(
  '/runs',
  protect('finance:read'),
  validate({ query: agentRunsQuerySchema }),
  agentController.listRuns,
);

// GET /api/v1/agent/runs/:id (finance:read)
agentRouter.get(
  '/runs/:id',
  protect('finance:read'),
  validate({ params: runIdParamSchema }),
  agentController.getRun,
);
