import type { Request, RequestHandler, Response } from 'express';
import type { InvoicesQuery } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler.js';
import { ok } from '../../core/http/respond.js';
import { invoicesService } from './invoices.service.js';

export const invoicesController: {
  list: RequestHandler;
} = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const query = req.query as unknown as InvoicesQuery;
    const invoices = await invoicesService.list(tenantId, query);
    ok(res, invoices);
  }),
};

