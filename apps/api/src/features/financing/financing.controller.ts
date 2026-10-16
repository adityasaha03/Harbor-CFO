import type { Request, RequestHandler, Response } from 'express';
import type { FinancingMatchInput } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { financingService } from './financing.service';

export const financingController: {
  listOffers: RequestHandler;
  matchFinancing: RequestHandler;
} = {
  listOffers: asyncHandler(async (_req: Request, res: Response) => {
    const offers = await financingService.listOffers();
    ok(res, offers);
  }),

  matchFinancing: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const input = req.body as FinancingMatchInput;
    const result = await financingService.matchFinancing(actor, input);
    ok(res, result);
  }),
};
