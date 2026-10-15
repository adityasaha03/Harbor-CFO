import type { Request, RequestHandler, Response } from 'express';
import type { LedgerQuery } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { ledgerService } from './ledger.service';

export const ledgerController: {
  list: RequestHandler;
} = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const query = req.query as unknown as LedgerQuery;

    const result = await ledgerService.list(tenantId, query);
    ok(res, result.items, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }),
};

export const ledgerEntriesController = ledgerController;

