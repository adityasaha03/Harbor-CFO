import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { reportsService } from './reports.service';

export const reportsController: {
  getCashSummary: RequestHandler;
} = {
  getCashSummary: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const month = req.query.month as string | undefined;
    const format =
      (req.query.format as string | undefined)?.toLowerCase() === 'pdf' ? 'pdf' : 'csv';

    if (format === 'pdf') {
      const { pdf, filename } = await reportsService.exportPdf(tenantId, month);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(pdf);
      return;
    }

    const { csv, filename } = await reportsService.exportCsv(tenantId, month);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }),
};
