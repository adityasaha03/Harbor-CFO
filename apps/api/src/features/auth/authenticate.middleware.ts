import type { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError } from '../../core/http/app-error';
import { verifyAccessToken } from './jwt-verifier';
import './auth.types';

const BEARER_PREFIX = 'Bearer ';

/**
 * Middleware that extracts and verifies the Bearer JWT from the Authorization header.
 * Populates req.auth with identity details upon success.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return next(new UnauthenticatedError('Authentication required'));
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    return next(new UnauthenticatedError('Authentication required'));
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    return next(new UnauthenticatedError('Authentication required'));
  }

  try {
    const verified = await verifyAccessToken(token);
    req.auth = {
      userId: verified.userId,
      token,
      expiresAt: verified.expiresAt,
    };
    next();
  } catch (error) {
    next(error);
  }
}
