import type { Request, RequestHandler, Response } from 'express';
import type { CreateCommitmentInput, UpdateCommitmentInput } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler.js';
import { created, ok } from '../../core/http/respond.js';
import { commitmentsService } from './commitments.service.js';

export const commitmentsController: {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
} = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const commitments = await commitmentsService.list(tenantId);
    ok(res, commitments);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const data = req.body as CreateCommitmentInput;
    const commitment = await commitmentsService.create(tenantId, data);
    created(res, commitment);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const id = String(req.params.id);
    const patch = req.body as UpdateCommitmentInput;
    const commitment = await commitmentsService.update(tenantId, id, patch);
    ok(res, commitment);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const id = String(req.params.id);
    await commitmentsService.delete(tenantId, id);
    ok(res, { success: true });
  }),
};
