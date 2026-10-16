import type { Request, RequestHandler, Response } from 'express';
import type { AlertsQuery } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { alertsService } from './alerts.service';

export const alertsController: {
  list: RequestHandler;
  getById: RequestHandler;
} = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const query = req.query as unknown as AlertsQuery;
    const alerts = await alertsService.list(tenantId, { status: query.status });
    ok(res, alerts);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const id = req.params.id as string;
    const alert = await alertsService.getById(tenantId, id);
    ok(res, alert);
  }),
};
