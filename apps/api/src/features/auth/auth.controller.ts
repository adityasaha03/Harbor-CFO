import type { Request, Response } from 'express';
import { ROLE_PERMISSIONS } from '@harbor/contracts';
import { ForbiddenError } from '../../core/http/app-error';
import { ok } from '../../core/http/respond';

export function getMeController(req: Request, res: Response): void {
  if (!req.actor) {
    throw new ForbiddenError('Not a member of this company');
  }

  const { userId, tenantId, role } = req.actor;
  const permissions = ROLE_PERMISSIONS[role];

  ok(res, {
    userId,
    tenantId,
    role,
    permissions,
  });
}
