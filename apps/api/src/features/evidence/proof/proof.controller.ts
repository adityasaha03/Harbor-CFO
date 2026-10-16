import type { Request, Response } from 'express';
import { proofCheckIdSchema } from '@harbor/contracts';
import { ForbiddenError, ValidationError } from '../../../core/http/app-error';
import { ok } from '../../../core/http/respond';
import { TenantSettingsModel } from '../../tenants/tenants.model';
import { getProofCatalog, executeProofCheck } from './checks';

async function assertDemoTenant(tenantId: string): Promise<void> {
  const settings = await TenantSettingsModel.findOne({ tenantId }).lean();
  if (!settings || !settings.isDemo) {
    throw new ForbiddenError('Proof checks are only available for demo tenants');
  }
}

export const proofController = {
  async getCatalog(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    await assertDemoTenant(actor.tenantId);
    const checks = getProofCatalog();
    ok(res, { checks });
  },

  async runCheck(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    await assertDemoTenant(actor.tenantId);

    const checkIdParse = proofCheckIdSchema.safeParse(req.params.id);
    if (!checkIdParse.success) {
      throw new ValidationError(`Unknown proof check ID: "${req.params.id}"`);
    }

    const result = await executeProofCheck(actor, checkIdParse.data);
    ok(res, result);
  },
};
