import { Router } from 'express';
import { createScenarioInputSchema, scenarioIdParamSchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { createRateLimiter } from '../../core/security/rate-limit';
import { scenariosController } from './scenarios.controller';
import { SCENARIO_RATE_LIMIT_MAX, SCENARIO_RATE_LIMIT_WINDOW_MS } from './scenarios.constants';

export const scenariosRouter: Router = Router();

const scenarioWriteLimiter = createRateLimiter({
  windowMs: SCENARIO_RATE_LIMIT_WINDOW_MS,
  max: SCENARIO_RATE_LIMIT_MAX,
});

// POST /api/v1/scenarios (scenarios:write, rate limited)
scenariosRouter.post(
  '/',
  protect('scenarios:write'),
  scenarioWriteLimiter,
  validate({ body: createScenarioInputSchema }),
  scenariosController.create,
);

// POST /api/v1/scenarios/presets/stress (scenarios:write, rate limited)
scenariosRouter.post(
  '/presets/stress',
  protect('scenarios:write'),
  scenarioWriteLimiter,
  scenariosController.createStressPreset,
);

// GET /api/v1/scenarios (recent, finance:read)
scenariosRouter.get('/', protect('finance:read'), scenariosController.list);

// GET /api/v1/scenarios/:id (finance:read, includes isStale)
scenariosRouter.get(
  '/:id',
  protect('finance:read'),
  validate({ params: scenarioIdParamSchema }),
  scenariosController.getById,
);
