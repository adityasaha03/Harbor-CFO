import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../../core/http/app-error';
import { recordAuthDenial } from './denial-hook';
import { findMembership } from './membership.repository';
import './auth.types';

const NOT_A_MEMBER_MESSAGE = 'Not a member of this company';

/**
 * Middleware that extracts X-Tenant-Id header, queries membership dynamically
 * from the database, and populates req.actor.
 */
export async function tenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    return next(new UnauthenticatedError('Authentication required'));
  }

  const rawTenantId = req.headers['x-tenant-id'];
  if (!rawTenantId || typeof rawTenantId !== 'string') {
    return next(new ForbiddenError(NOT_A_MEMBER_MESSAGE));
  }

  const tenantId = rawTenantId.trim();
  if (tenantId.length === 0) {
    return next(new ForbiddenError(NOT_A_MEMBER_MESSAGE));
  }

  const requestId =
    (typeof req.id === 'string' && req.id.trim().length > 0 ? req.id.trim() : null) ??
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim().length > 0
      ? req.headers['x-request-id'].trim()
      : randomUUID());

  try {
    const membership = await findMembership(req.auth.userId, tenantId);
    if (!membership) {
      recordAuthDenial({
        tenantId,
        actorId: req.auth.userId,
        action: 'membership.denied',
        decision: 'denied',
        reasonCode: 'NOT_A_MEMBER',
        resourceRefs: [],
        traceId: requestId,
      });

      return next(new ForbiddenError(NOT_A_MEMBER_MESSAGE));
    }

    req.actor = {
      userId: req.auth.userId,
      tenantId,
      role: membership.role,
      requestId,
    };

    next();
  } catch (error) {
    next(error);
  }
}
