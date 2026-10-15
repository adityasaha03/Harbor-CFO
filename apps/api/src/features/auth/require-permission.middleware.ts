import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { hasPermission, type Permission } from '@harbor/contracts';
import { ForbiddenError } from '../../core/http/app-error';
import { logger } from '../../core/logging/logger';
import { authenticate } from './authenticate.middleware';
import { tenantContext } from './tenant-context.middleware';

/**
 * Middleware factory requiring that the authenticated actor holds the specified permission.
 * Denials are logged as a warning for auditing.
 */
export function requirePermission(permission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    if (!hasPermission(req.actor.role, permission)) {
      logger.warn(
        {
          requestId: req.actor.requestId,
          tenantId: req.actor.tenantId,
          userId: req.actor.userId,
          role: req.actor.role,
          permission,
        },
        'Permission denied',
      );
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Standard route protection pipeline:
 * 1. Authenticate bearer JWT
 * 2. Resolve dynamic tenant membership and role
 * 3. Enforce permission against the contracts permission matrix
 */
export function protect(permission: Permission): RequestHandler[] {
  return [authenticate, tenantContext, requirePermission(permission)];
}

/**
 * Protection pipeline for endpoints that require valid company membership
 * without a specific fine-grained permission (e.g. GET /api/v1/me).
 */
export function protectMember(): RequestHandler[] {
  return [authenticate, tenantContext];
}
