import { Router } from 'express';
import { getMeController } from './auth.controller';
import { protectMember } from './require-permission.middleware';

export const authRouter: Router = Router();

/**
 * GET /api/v1/me
 * Returns caller identity, tenant context, active role, and permission matrix.
 * Requires valid JWT and active company membership.
 */
authRouter.get('/', ...protectMember(), getMeController);
