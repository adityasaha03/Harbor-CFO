import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { accountsService } from './accounts.service';

export const accountsController: {
  list: RequestHandler;
} = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const accounts = await accountsService.list(tenantId);
    ok(res, accounts);
  }),
};

