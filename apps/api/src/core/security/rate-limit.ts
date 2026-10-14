import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RateLimitedError } from '../http/app-error';

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions = {}): RequestHandler {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 120;
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  const keyGenerator =
    options.keyGenerator ??
    ((req: Request) => {
      const actorContext = (req as { actorContext?: { userId?: string } }).actorContext;
      if (actorContext?.userId) {
        return actorContext.userId;
      }
      return req.ip || '127.0.0.1';
    });

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new RateLimitedError(
          'Too many requests, please try again later',
          undefined,
          retryAfterSeconds,
        ),
      );
    },
  });
}
