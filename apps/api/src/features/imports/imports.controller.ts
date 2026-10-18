import type { Request, Response } from 'express';
import {
  type ImportKind,
  type ImportsQuery,
  type ImportPreviewBody,
  type TransformImportInput,
} from '@harbor/contracts';
import { ok } from '../../core/http/respond';
import { ValidationError } from '../../core/http/app-error';
import { importsService } from './imports.service';

export const importsController = {
  async preview(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new ValidationError('File upload is required');
    }

    const { kind } = req.body as ImportPreviewBody;
    if (!kind) {
      throw new ValidationError('kind must be specified (transactions or invoices)');
    }

    const result = await importsService.preview(req.actor!, kind as ImportKind, req.file);
    ok(res, result);
  },

  async commit(req: Request, res: Response): Promise<void> {
    const importId = req.params.id as string;
    const result = await importsService.commit(req.actor!, importId);
    ok(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const importId = req.params.id as string;
    const result = await importsService.getById(req.actor!, importId);
    ok(res, result);
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ImportsQuery;
    const { items, total, page, pageSize } = await importsService.list(req.actor!, query);
    ok(res, items, { total, page, pageSize });
  },

  async getErrorsCsv(req: Request, res: Response): Promise<void> {
    const importId = req.params.id as string;
    const csv = await importsService.getErrorsCsv(req.actor!, importId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import-${importId}-errors.csv"`);
    res.status(200).send(csv);
  },

  async transform(req: Request, res: Response): Promise<void> {
    const input = req.body as TransformImportInput;
    const result = await importsService.transform(input);
    ok(res, result);
  },
};
