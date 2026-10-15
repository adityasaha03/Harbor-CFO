import type { Request, RequestHandler, Response } from 'express';
import type { AuditQuery } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { auditService } from './audit.service';

export const auditController: { list: RequestHandler } = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const query = req.query as unknown as AuditQuery;

    const result = await auditService.list(tenantId, query);

    ok(res, result.items, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }),
};
