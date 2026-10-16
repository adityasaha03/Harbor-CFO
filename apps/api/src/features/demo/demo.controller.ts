import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { ok } from '../../core/http/respond';
import { demoService } from './demo.service';

export const demoController = {
  async reset(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    const result = await demoService.resetCallerDemo(actor, env.ENABLE_DEMO_RESET);
    ok(res, result);
  },
};
