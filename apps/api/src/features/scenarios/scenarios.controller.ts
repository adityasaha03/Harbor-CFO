import type { Request, RequestHandler, Response } from 'express';
import type { CreateScenarioInput } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok, created } from '../../core/http/respond';
import { scenariosService } from './scenarios.service';

export const scenariosController: {
  create: RequestHandler;
  createStressPreset: RequestHandler;
  list: RequestHandler;
  getById: RequestHandler;
} = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const input = req.body as CreateScenarioInput;
    const result = await scenariosService.createScenario(actor, input);
    created(res, result);
  }),

  createStressPreset: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const days = typeof req.body?.days === 'number' ? req.body.days : 14;
    const result = await scenariosService.createStressPreset(actor, days);
    created(res, result);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const scenarios = await scenariosService.list(tenantId);
    ok(res, scenarios);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const id = String(req.params.id);
    const scenario = await scenariosService.getById(tenantId, id);
    ok(res, scenario);
  }),
};
