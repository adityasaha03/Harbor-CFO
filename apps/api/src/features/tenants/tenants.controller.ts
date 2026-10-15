import type { Request, RequestHandler, Response } from 'express';
import type { UpdateTenantSettingsInput } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { tenantsService } from './tenants.service';

export const tenantsController: {
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
} = {
  getSettings: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const settings = await tenantsService.ensureSettings(tenantId);
    ok(res, settings);
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const patch = req.body as UpdateTenantSettingsInput;
    const updated = await tenantsService.updateSettings(tenantId, patch);
    ok(res, updated);
  }),
};

