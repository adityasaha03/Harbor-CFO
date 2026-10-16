import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { forecastService } from './forecast.service';

export const forecastController: {
  getLatest: RequestHandler;
  getById: RequestHandler;
  getDayDrilldown: RequestHandler;
} = {
  getLatest: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const result = await forecastService.getBaseline(tenantId);
    ok(res, result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const id = String(req.params.id);
    const run = await forecastService.getById(tenantId, id);
    ok(res, run);
  }),

  getDayDrilldown: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const date = String(req.params.date);
    const drilldown = await forecastService.getDayDrilldown(tenantId, date);
    ok(res, drilldown);
  }),
};
