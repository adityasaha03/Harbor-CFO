import type { Request, Response } from 'express';
import { ok } from '../../core/http/respond';
import { evidenceService } from './evidence.service';

export const evidenceController = {
  async export(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    const bundle = await evidenceService.buildEvidenceBundle(actor.tenantId);
    ok(res, bundle);
  },
};
