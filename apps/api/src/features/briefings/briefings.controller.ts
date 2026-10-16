import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { briefingsService } from './briefings.service';

export const briefingsController: {
  getLatest: RequestHandler;
} = {
  getLatest: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const briefing = await briefingsService.getLatestBriefing(tenantId);
    ok(res, briefing);
  }),
};
