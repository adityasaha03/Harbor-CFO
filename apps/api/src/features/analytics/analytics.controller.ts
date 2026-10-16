import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { analyticsService } from './analytics.service';

export const analyticsController: {
  getSummary: RequestHandler;
} = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const summary = await analyticsService.getSummary(tenantId);
    ok(res, summary);
  }),
};
